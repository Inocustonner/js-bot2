import { port } from "./olimp"

export const ensure_authorization = async (): Promise<void> => {
  let authorized: boolean = document.querySelector('.exitBtn') != null
  if (!authorized) {
    port.sendRequest({ request: "getAuth" })
    const { login, pwd } = await port.receiveRequest()

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
