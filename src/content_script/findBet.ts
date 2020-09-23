import * as $ from "jquery"

const koef_class_name = "bet_sel koefs"
let mid = ""

interface OutcomePair {
  outcome: string
  koefEl: HTMLElement
}

type SOPair = [string, string]

const getSections = (): HTMLElement[] => {
  return $(`#odd${mid}>div`).children("b").toArray()
}


const makePairs = (nobrs: JQuery): OutcomePair[] => {
  console.debug("Making pairs from", nobrs.toArray())
  const makePair = (nobr: HTMLElement): OutcomePair[] => {
    // if this is a .googleStatIssue > .googleStatIssueName > singleBet structure
    let parent = nobr.querySelector(".bet_sel.koefs").parentElement
    let outcomes: OutcomePair[] = []

    let outcome = ""
    let nodes = parent.childNodes
    // outcome for koef element = all text before koef element
    for (let i = 0; i < nodes.length; ++i) {
      let node: Node = nodes[i]
      if (
        node.nodeName == "SPAN" &&
        (node as HTMLElement).className == koef_class_name
      ) {
        outcomes.push({
          outcome: outcome.trim().slice(null, -2),
          koefEl: node as HTMLElement,
        })
        outcome = ""
      } else if (node.nodeName != "#comment") outcome += node.textContent
    }
    return outcomes
  }
  let nobrs_ = nobrs.toArray()
  console.debug(nobrs_)
  return nobrs_.map(makePair).flat()
}

const getOutcomes = (section: JQuery): OutcomePair[] => {
  if (section.prop("tagName") == "DIV") {
    return makePairs(section.children("nobr"))
  } else {
    return makePairs(section.next().nextUntil("br", "nobr"))
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
  elements: string[],
  determinator_for: string
) => {
  if (elements.length > 1) {
    let matched_sections: string = elements.join(", ")
    throw Error(`Ambiguous returns. '${determinator_for}' determinator '${regex_str}' matched: ${matched_sections}`)
  } else
    throw Error(`'${determinator_for}' determinator '${regex_str}' matched nothing`)
}

const get_teams = (): string[] => {
  return $(`#match_live_name_${mid}`).text().trim().split(" - ")
}

const get_section = (
  section: string,
  section_regex: RegExp
): JQuery => {
  const sections: HTMLElement[] = filterMatch(
    getSections(),
    section_regex,
    (e: HTMLElement) => e.innerText.slice(null, -1) // -1 to remove ':' at the end
  )
  if (sections.length == 1) {
    return $(sections[0])
  } else ThrowDeterminatorError(section, sections.map(e => e.innerText.trim().slice(null, -1)), "Section")
}

const findBetElemSingle = (
  section: string,
  outcome: string
): HTMLElement => {
  /* Runtime vars */
  // IMPORTANT: all regexes should eval it this context, because some of them contain reference variables
  const [team1, team2] = get_teams()
  let section_el: JQuery

  const section_regex = new RegExp(eval(section), 'i') // case-insencetive
  // add if section == '' then pick header section bets
  // otherwise we know that this is the header section(section with no name)
  if (section != "``") {
    section_el = get_section(section, section_regex)
  } else {
    section_el = $(`#odd${mid}`)
  }

  // if found section
  const oucome_regex = new RegExp(eval(outcome), 'i')
  let raw_outcomes = getOutcomes(section_el)
  console.debug(raw_outcomes)

  const outcomes: OutcomePair[] = filterMatch(
    raw_outcomes,
    oucome_regex,
    (e: OutcomePair) => e.outcome
  )
  // if found outcome
  if (outcomes.length != 1) ThrowDeterminatorError(outcome, outcomes.map(e => e.outcome), "Outcome")
  return outcomes[0].koefEl
}

export const findBetElem = (
  SOPairs: SOPair[],
  mid_arg: string
) => {
  let errors = ""
  mid = mid_arg
  for (let [section, outcome] of SOPairs) {
    try {

      let koefEl = findBetElemSingle(section, outcome)
      return koefEl

    } catch (error) {
      errors = errors.concat(error.stack + '\n\n')
    }
  }
  throw errors;
}
