// copy of sendRequest from olimp.ts
// maybe i consider moving this function in new utils.ts file
const sendRequest = (msg: any): Promise<any> => {
  return new Promise(r => {
    chrome.runtime.sendMessage(msg, r)
  })
}

export const ensure_autorization = async (): new Promise<void> => {
  let authorized: bool = document.querySelector('.exitBtn') != null
  if (!authorized) {
    const { login, pwd } = await sendRequest("getAuth")
    const inputFormParent = document.querySelector(".enter-block.clearfix") as HTMLElement
    const inputs = inputFormParent.children[0].querySelectorAll('input') as HTMLInputElement
    inputs[0].value = login
    inputs[1].value = pwd;
    (inputFormParent.querySelector('form') as HTMLFormElement).submit()
  } ppp
  return new Promise(
    r => authorized ? r() : false)
}
