// type PortCallback = (port: chrome.runtime.Port) => void
// const portCallbacks: Map<string, PortCallback>

// export const addCallback = (port_name: string, callback: PortCallback): boolean {
// 	if (!portCallbacks.has(port_name)) {
// 		portCallbacks.set(port_name, callback)
// 		return true
// 	} else return false
// }

// export const portDriverEntry() => {
// 	chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
// 		const name = port.name
// 		if (name && portCallbacks.has(name))	{
// 			portCallbacks.get(name)(port)
// 			portCallbacks.delete(name)
// 		} else {
// 			if (typeof name != "string") {
// 				console.error("Invalid port name recived", name,
// 											"\nClosing port")
// 			}
// 			else {
// 				console.error("No callback assosiated with port name", name,
// 											"\nClosing port")
// 			}
// 			port.disconnect()
// 		}
// 	})
// }
