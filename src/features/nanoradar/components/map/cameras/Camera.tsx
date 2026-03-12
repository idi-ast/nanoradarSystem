import { IconMaximize, IconMinimize, IconX } from "@tabler/icons-react"
import { useState } from "react"

function Camera() {
    const [minimize, setMinimize] = useState(false)
    const [fullScreen, setFullScreen] = useState(false)
    return (
        <div className={`absolute left-0 bottom-0 rounded-b-2xl px-2 ${fullScreen && "w-full h-full"}`}>
            <div className="absolute flex justify-start gap-5 items-center left-0 top-0 bg-linear-to-r from-bg-100 to-bg-200/20 w-full">
                <h2 className={`p-2 ${minimize ? "text-xs" : ""}`}>Camara NanoRadar</h2>
                <button className={`rounded flex items-center gap-1 ${!minimize ? "hover:bg-brand-100/80" : "hover:bg-brand-200/80"} p-0.5`} onClick={() => setMinimize(!minimize)}>
                    {minimize ? <IconMaximize size={24} stroke={1.5} /> : <IconMinimize size={24} stroke={1.5} />}
                    {minimize ? <span>maximizar</span> : <span>minimizar</span>}
                </button>

                {!minimize && <button className="flex items-center gap-1 hover:bg-brand-200/80 p-0.5" onClick={() => setFullScreen(true)}>
                    {fullScreen ? <IconMinimize size={24} stroke={1.5} /> : <IconMaximize size={24} stroke={1.5} />}
                    <span>Pantalla Completa</span>
                </button>}
            </div>
            <div className={`overflow-hidden  ${minimize ? "h-40 w-60" : fullScreen ? " h-screen w-full" : "h-full rounded-2xl"}`}>
                {fullScreen && <button
                    onClick={() => setFullScreen(false)}
                    className="absolute top-1 right-15 bg-brand-100/80 text-text-100 rounded-full  ">
                    <IconX size={35} stroke={1.5} />
                </button>}
                <img src="http://10.30.7.14:8001/api-system/video_feed" alt="" className={`w-full h-full ${fullScreen ? "w-full h-full" : "aspect-video"}`} />
            </div>
        </div>)
}

export default Camera