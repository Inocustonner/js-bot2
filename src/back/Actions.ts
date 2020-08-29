import { default as axios } from "axios"

interface Action {
  action: string,
  handler: (...args: any) => any,
  [key: string]: any
}

const actions: Action[] = [
  {
    action: 'sendPost',
    handler: axios.post,
  }
]

chrome.runtime.onMessage.addListener((msg: any, sender, sendResponse) => {
  if (!msg.action) return

  let ra = msg.action // requested action
  actions.find(a => a.action == ra)?.handler(...msg.data)
})
