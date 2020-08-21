export const createTab = async (url: string): Promise<chrome.tabs.Tab> => {
  return new Promise(r => {
    chrome.tabs.create({url: url}, r)
  })
}

export const closeTab = async (tabid: number): Promise<void> => {
  return new Promise(r => {
    chrome.tabs.remove(tabid, r)
  })
}