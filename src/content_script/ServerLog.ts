const createTableHtml = (
  outcome: string,
  section: string,
  koef: number,
  stake: number
): string => {
  return `<html>
<link type="text/css" rel="stylesheet" href="style.css">
<body>
<h1>Outcome: ${outcome} | Section${section} | Koef: ${koef} | Stake ${stake}<h1>
${$(`.koeftable2`).prop("outerHTML")}
</body>
</html>`
}

export const logTableAndParamsOnServer = (
  mid: string,
  outcome: string,
  section: string,
  koef: number,
  stake: number
) => {
  let postUrl = `http://192.168.6.3/api/store_data?dir=betpages&key=${$(
    `#match_live_name_${mid}`
  ).text()}.html`
  let data = createTableHtml(outcome, section, koef, stake)
  console.info('Sending table on:', postUrl)
  chrome.runtime.sendMessage({ action: "sendPost", data: [postUrl, data] })
}
