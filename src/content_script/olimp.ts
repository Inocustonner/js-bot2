import * as $ from "jquery"
import { logTableAndParamsOnServer } from "./ServerLog"

const urlParams = new URLSearchParams(location.search)
const mid: string = urlParams.get("mid")

const sendRequest = (msg: any): Promise<any> => {
  return new Promise(r => {
    chrome.runtime.sendMessage(msg, r)
  })
}

interface ReturnStatus {
  status: string
  comment?: string
}

const finish = (status: ReturnStatus = { status: "success" }) => {
  sendRequest(status)
}

const getSections = (): HTMLElement[] => {
  return []
}

const getOutcomes = (section: HTMLElement): HTMLElement[] => {
  return []
}

const constf = (arg: any) => arg

const filterMatchAll = (
  obj: any,
  regex: RegExp,
  transform: (e: any) => string = constf
): any => obj.filter((e: any) => transform(e).matchAll(regex))

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

const findBetElem = (section: string, outcome: string): HTMLElement => {
  /* Runtime vars */
  const team1 = "Team1" // get team name
  const team2 = "Team2" // get team name

  const section_regex = new RegExp(eval(section))
  const sections: HTMLElement[] = filterMatchAll(
    getSections(),
    section_regex,
    (e: HTMLElement) => e.innerText.trim() // !!
  )
  // if found section
  if (sections.length == 1) {
    const current_section: HTMLElement = sections[0]
    const oucome_regex = new RegExp(outcome)
    const outcomes = filterMatchAll(
      getOutcomes(current_section),
      oucome_regex,
      (e: HTMLElement) => e.innerText.trim() // !!
    )
    // if found outcome
    if (outcomes.length == 1) {
      return outcomes[0]
    } else ThrowDeterminatorError(outcome, outcomes, "Outcome")
  } else ThrowDeterminatorError(section, sections, "Section")
}

const on_loaded = async () => {
  const { outcome, section, koef, stake } = await sendRequest("getInfo")
  console.info("BettingInfo", outcome, section, koef, stake)

  try {
    let betElem: HTMLElement = findBetElem(section, outcome)
    betElem.style.backgroundColor = "#FF1111" // red
  } catch (error) {
    logTableAndParamsOnServer(mid, outcome, section, koef, stake)
    finish({ status: "error", comment: error })
    return;
  }
  logTableAndParamsOnServer(mid, outcome, section, koef, stake) // maybe make it promise?
  finish()
}

const onExists = (selector: string, parent?: HTMLElement): Promise<void> => {
  parent = parent ? parent : document.body
  return new Promise(r => {
    let observer = new MutationObserver(m => {
      if ($(selector).length) r()
    })
    observer.observe(parent, {
      subtree: true,
      childList: true,
    })
  })
}

onExists(`#odd${mid}`, $(".bing-table-width").get(0)).then(on_loaded)
setTimeout()
