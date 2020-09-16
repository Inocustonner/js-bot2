// copy of sendRequest from olimp.ts
// maybe i consider moving this function in new utils.ts file
const sendRequest = (msg: any): Promise<any> => {
  return new Promise(r => {
    chrome.runtime.sendMessage(msg, r)
  })
}

export const ensure_authorization = async (): Promise<void> => {
  let authorized: boolean = document.querySelector('.exitBtn') != null
  if (!authorized) {
    const { login, pwd } = await sendRequest("getAuth")
    const inputFormParent = document.querySelector(".enter-block.clearfix") as HTMLElement
    let inputs = inputFormParent.children[0].querySelectorAll('input')
    let loginInp = inputs[0] as HTMLInputElement
    let pwdInp = inputs[1] as HTMLInputElement
    loginInp.value = login
    pwdInp.value = pwd;
    (inputFormParent.querySelector('form') as HTMLFormElement).submit()
  }
  return new Promise(
    r => authorized ? r() : false)
}
