"use client"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const phrases = [
    "Loading the magic...",
    "Crunching numbers...",
    "Summoning the data gods...",
    "Preparing your dashboard...",
    "Brewing some statistics...",
    "Almost there...",
    "Fetching the latest insights...",
    "Optimizing performance...",
    "Running the numbers...",
    "Synchronizing with the server...",
    "Gathering metrics...",
    "Fine-tuning results...",
    "Polishing the interface...",
    "Finalizing calculations...",
    "Cross-checking trends...",
    "Hold on tight...",
    "Compiling data...",
    "Organizing insights...",
    "Perfecting the display...",
    "One last touch...",
]

export default function LoadingOverlay({ finished }: { finished: boolean }) {
    const [currentPhrase, setCurrentPhrase] = useState(phrases[0])
    const [showOverlay, setShowOverlay] = useState(true)
    const [isComplete, setIsComplete] = useState(false)

    useEffect(() => {
        if (!finished) {
            const interval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * phrases.length)
                setCurrentPhrase(phrases[randomIndex])
            }, Math.random() * (5000 - 3000) + 3000) // Random between 3s - 5s
            return () => clearInterval(interval)
        }
    }, [finished])

    useEffect(() => {
        if (finished) {
            setTimeout(() => setIsComplete(true), 1000)
            setTimeout(() => setShowOverlay(false), 2000)
        }
    }, [finished])

    return (
        <AnimatePresence>
            {showOverlay && (
                <motion.div
                    key="overlay"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: isComplete ? 0 : 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="fixed inset-0 flex items-center justify-center bg-gradient-to-r from-[#F6B37F]/40 via-[#5A69E7]/40 to-[#96E3D4]/40 animate-wave z-50"
                >
                    <AnimatePresence mode="popLayout">
                        {!isComplete ? (
                            <motion.div
                                key={currentPhrase}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 2, ease: "easeInOut" }}
                                className="text-white text-2xl font-semibold text-center"
                            >
                                {currentPhrase}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="thanks"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 1 }}
                                className="text-white text-3xl font-bold text-center"
                            >
                                Thanks! 🚀
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
