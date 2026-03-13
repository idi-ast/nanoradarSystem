import LineGradientWhite from "@/components/ui/LineGradientWhite"
import { IconBrandZeit } from "@tabler/icons-react"

function ConfigZones() {
    return (
        <div className="flex flex-col gap-1">
            <div className="relative">
                <LineGradientWhite top="-0.05rem" height="1.5rem" color={"green"} />
                <button
                    className="relative text-text-200 hover:text-text-100 outline outline-transparent p-0.5 bg-linear-to-b from-bg-100 to-bg-200  shadow-lg shadow-bg-100 h-8 w-8 flex justify-center items-center transition-all"
                    title="Alejar"
                >
                    <IconBrandZeit size={20} />
                </button>
            </div>
        </div>
    )
}

export default ConfigZones