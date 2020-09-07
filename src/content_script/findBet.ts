import { map } from "jquery"
import * as $ from "jquery"

interface OutcomePair {
  outcome: string,
  koefEl: HTMLElement
}

const getSections = (mid: string): HTMLElement[] => {
  return $(`#odd${mid}>div`).children('b').toArray()
}

const makePairs = (nobrs: JQuery): OutcomePair[] => {
  console.debug('Making pairs from', nobrs.toArray())
  const makePair = (nobr: HTMLElement): OutcomePair[] => {
    // if this is a .googleStatIssue > .googleStatIssueName > singleBet structure
    if (nobr.querySelector('.bet_sel.koefs').previousElementSibling) {
      let koefEl = nobr.querySelector('.bet_sel.koefs') as HTMLElement
      let outcome = (koefEl.previousElementSibling as HTMLElement).innerText
      return [{ outcome: outcome, koefEl: koefEl }]
    }
    else {
      return $('.bet_sel.koefs').map(
        (i: number, elem: HTMLElement) => {
          let outcome = elem.previousSibling.textContent.trim().slice(null, -2)
          return { outcome: outcome, koefEl: elem } as OutcomePair
        }
      ).toArray()
    }
  }
  return map(nobrs.toArray(), makePair).flat()
}

const getOutcomes = (section: JQuery): OutcomePair[] => {
  if (section.prop('tagName') == "DIV") {
    return makePairs(section.children('nobr'))
  }
  else {
    return makePairs(section.next().nextUntil('br', 'nobr'))
  }
}

const constf = (arg: any) => arg

const filterMatch = <T>(
  obj: T[],
  regex: RegExp,
  transform: (e: T) => string = constf
): any => obj.filter((e: any) => transform(e).match(regex))

const ThrowDeterminatorError = (
  regex_str: string,
  elements: HTMLElement[],
  determinator_for: string
) => {
  if (elements.length > 1) {
    let matched_sections: string = elements
      .map(e => e.innerText.trim())
      .join(", ")
    throw Error(
      `Ambiguous returns. ${determinator_for} determinator '${regex_str}' matched: ${matched_sections}`
    )
  } else
    throw Error(
      `${determinator_for} determinator '${regex_str}' matched nothing`
    )
}

const get_teams = (mid: string): string[] => {
  return $(`#match_live_name_${mid}`).text().trim().split(' - ')
}

const get_section = (section: string, section_regex: RegExp, mid: string): JQuery => {
  const sections: HTMLElement[] = filterMatch(
    getSections(mid),
    section_regex,
    (e: HTMLElement) => e.innerText.slice(null, -1) // -1 to remove ':' at the end
  )
  if (sections.length == 1) {
    return $(sections[0])
  }
  else
    ThrowDeterminatorError(section, sections, "Section")
}

export const findBetElem = (section: string, outcome: string, mid: string): HTMLElement => {
  debugger
  /* Runtime vars */
  // IMPORTANT: all regexes should eval it this context, because some of them contain reference variables
  const [team1, team2] = get_teams(mid)
  let section_el: JQuery

  const section_regex = new RegExp(eval(section), 'i') // case-insencetive

  // add if section == '' then pick header section bets
  // otherwise we know that this is the header section(section with no name)
  if (section) {
    section_el = get_section(section, section_regex, mid)
  }
  else {
    section_el = $(`#odd${mid}`)
  }
  
  // if found section
  const oucome_regex = new RegExp(outcome)
  let raw_outcomes = getOutcomes(section_el)
  console.debug(raw_outcomes)
  
  const outcomes = filterMatch(
    raw_outcomes,
    oucome_regex,
    (e: OutcomePair) => e.outcome
  )
  // if found outcome
  if (outcomes.length != 1)
    ThrowDeterminatorError(outcome, outcomes, "Outcome")
  return outcomes[0]
}
