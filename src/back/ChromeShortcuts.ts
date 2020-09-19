export const createTab = async (url: string): Promise<chrome.tabs.Tab> => {
  return new Promise(r => {
    chrome.tabs.create({ url: url }, r)
  })
}

export const closeTab = async (tabid: number): Promise<void> => {
  return new Promise(r => {
    chrome.tabs.remove(tabid, r)
  })
}

export const tabLoadedFuture = async (tabid: number) => {
  let listener = function (
    tabid: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ) {
    if (changeInfo.status && changeInfo.status == "loading") this.r()
  }

  let lh: any
  return new Promise(r => {
    lh = listener.bind({ r: r })
    chrome.tabs.onUpdated.addListener(lh)
  }).finally(
    () => chrome.tabs.onUpdated.removeListener(lh))
}
