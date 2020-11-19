const getTabs = async (): Promise<Array<chrome.tabs.Tab>> => {
	return new Promise(r => chrome.tabs.query(null, r))
}

export const removeIfExists = async (tabid: number): Promise<void> => {
	return new Promise (async r => {
		const tabs = await getTabs()
		for (let tab of tabs) {
			if (tab.id == tabid) chrome.tabs.remove(tabid)
		}
	})
}

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
  let listener = function(
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

export const deleteAllCookie = async (): Promise<void> => {
	return new Promise(r => {
		// delete all cookies
		chrome.cookies.getAll({}, (cooks) => {
			for (let cookie of cooks) {
				chrome.cookies.remove({ url: "https://" + cookie.domain, name: cookie.name });
				chrome.cookies.remove({ url: "http://" + cookie.domain, name: cookie.name });
			}
		})
	})
}
