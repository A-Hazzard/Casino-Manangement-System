"use client"

import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
    const router = useRouter();

    const handleLogout = async () => {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            router.push('/login');
        } else {
            console.error('Failed to logout');
        }
    };

    return (
        <aside
            className="hidden md:flex fixed left-0 top-0 h-full w-32 bg-white shadow-md shadow-purple-500
                 z-50 flex-col items-end pt-6"
        >
            <Image
                src="dashboardButton.svg"
                width={50}
                height={50}
                className="w-[7rem]"
                alt="dashboard button"
            />
            {/* Other sidebar items */}
            <button
                onClick={handleLogout}
                className="group mt-auto mb-4 mx-auto p-2 rounded hover:bg-buttonActive"
                aria-label="Logout"
            >
                <LogOut className="w-6 h-6 text-gray-700 group-hover:text-white" />
            </button>

        </aside>
    );
}
