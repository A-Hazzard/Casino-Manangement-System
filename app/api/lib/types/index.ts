export type QueryFilter = {
    userId?: string;
    location?: string
    machine?: string
    readAt?: {
        $gte: Date
        $lte: Date
    }
}

export type ParamsType = {
    timePeriod: "Today" | "Yesterday" | "7d" | "30d" | "Custom";
    licencee: string;
};

export type TimePeriod = ParamsType["timePeriod"]

export type CustomDate = {
    startDate: Date
    endDate: Date
}
