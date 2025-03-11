"use client";

import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CustomSelectProps } from "@/lib/types/componentProps";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

export default function CustomSelect(props: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Additional classes for disabled state:
    const disabledClasses = props.disabled
        ? "opacity-50 cursor-not-allowed"
        : "";

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    disabled={props.disabled}  // disable the button when needed
                    className={cn(
                        props.isActive ? "bg-buttonActive" : "bg-buttonInactive",
                        disabledClasses,
                        "text-white px-3 py-1 text-xs rounded-lg"
                    )}
                >
                    {`Sort by: ${
                        props.selectedFilter === "Today"
                            ? "Today"
                            : props.selectedFilter === "Yesterday"
                                ? "Yesterday"
                                : props.selectedFilter === "7d"
                                    ? "Last 7 Days"
                                    : props.selectedFilter === "30d"
                                        ? "Last 30 Days"
                                        : "Custom"
                    }`}
                    <ChevronsUpDown className="opacity-50 ml-2" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Search timeframe..." className="h-9" />
                    <CommandList>
                        <CommandEmpty>No options found.</CommandEmpty>
                        <CommandGroup>
                            {props.timeFrames
                                .filter((time) =>
                                    props.isTopPerforming ? time.time !== "Custom" : true
                                )
                                .map((time) => (
                                    <CommandItem
                                        key={time.time}
                                        value={time.time}
                                        onSelect={() => {
                                            if (props.disabled) return; // if disabled, do nothing
                                            props.onSelect(time.value);
                                            setIsOpen(false);
                                            if (props.isMobile && props.setShowDatePicker) {
                                                if (time.value.toLowerCase() === "custom") {
                                                    props.setShowDatePicker(true);
                                                } else {
                                                    props.setShowDatePicker(false);
                                                }
                                            }
                                        }}
                                        className={props.disabled ? "cursor-not-allowed opacity-50" : ""}
                                    >
                                        {time.time}
                                        <Check
                                            className={cn(
                                                "ml-auto",
                                                props.selectedFilter === time.time ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
