export async function loginUser({
                                    emailAddress,
                                    password,
                                }: {
    emailAddress: string
    password: string
}) {
    try {
        const res = await fetch("/api/auth/login/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ emailAddress, password }),
        })
        return await res.json()
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message: errorMessage };
    }

}

export async function sendForgotPasswordEmail({
                                                  emailAddress,
                                              }: {
    emailAddress: string
}) {
    try {
        const res = await fetch("/api/auth/forgot-password/route", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emailAddress }),
        })
        return await res.json()
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message: errorMessage };
    }

}
