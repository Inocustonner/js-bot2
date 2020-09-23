import * as $ from 'jquery'

const createTableHtml = (
  SOPairs: string,
  koef: number,
  stake: number,
  rawoutcome: string
): string => {
  return `<html>
<link type="text/css" rel="stylesheet" href="style.css">
<body>
<h1>Outcome: ${rawoutcome} | SOPairs ${SOPairs} | Koef: ${koef} | Stake ${stake}<h1>
${$(`.koeftable2`).prop("outerHTML")}
</body>
</html>`
}

export const logTableAndParamsOnServer = (
  mid: string,
  SOPairs: string,
  koef: number,
  stake: number,
  rawoutcome: string
) => {
  let postUrl = `http://192.168.6.3/dev/api/store_data?dir=betpages&key=${$(
    `#match_live_name_${mid}`
  ).text()}.html`
  let data = createTableHtml(SOPairs, koef, stake, rawoutcome)
  console.info("Sending table on:", postUrl)
  chrome.runtime.sendMessage({ action: "sendPost", data: [postUrl, data] })
}
