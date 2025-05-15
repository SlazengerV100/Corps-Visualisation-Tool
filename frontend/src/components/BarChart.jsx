import React, { useState, useEffect } from 'react'

const BarChart = () => {
    const serverUrl = import.meta.env.VITE_SERVER_URL

    const [data, setData] = useState("Loading...")

    const handleTest = async () => {
        const res = await fetch(`${serverUrl}/api/test`)
        const data = await res.json()
        setData(data.test)
    }

    useEffect(() => {
        handleTest().catch((err) => console.log(err))
    }, [])

    return (
        <p>{data}</p>
    )
}

export default BarChart