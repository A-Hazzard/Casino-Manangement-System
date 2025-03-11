import {licenceeSelectProps} from "@/lib/types/componentProps";
import {licenceeOptions} from "@/lib/constants/uiConstants";
import {licenceeOption} from "@/lib/types";

export default function LicenceeSelect({ selected, onChange }: licenceeSelectProps) {
    return (
        <div className="relative inline-block text-left">
            <select
                value={selected}
                onChange={(e) => onChange(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-base focus:border-buttonActive focus:outline-none focus:ring-1 focus:ring-buttonActive transition ease-in-out duration-150"
            >
                {licenceeOptions.map((option: licenceeOption) => (
                    <option key={option.value || "all"} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}