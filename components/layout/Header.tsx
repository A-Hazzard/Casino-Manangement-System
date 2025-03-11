import LicenceeSelect from "@/components/ui/LicenceeSelect";
import {HeaderProps} from "@/lib/types/componentProps";

export default function Header({ selectedLicencee, setSelectedLicencee }: HeaderProps) {

    return (
      <header className="p-4 md:px-0 md:pb-0 flex">
        {/* <Menu className="md:hidden text-grayHighlight" /> */}
          <div className="flex items-center space-x-4">
              <span className="mx-auto lg:mx-0 text-lg lg:text-2xl">Evolution CMS</span>
              <LicenceeSelect selected={selectedLicencee} onChange={setSelectedLicencee} />
          </div>
      </header>
    )
}