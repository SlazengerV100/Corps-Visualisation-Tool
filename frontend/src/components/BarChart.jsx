import React, { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'

const BarChart = () => {
    const serverUrl = import.meta.env.VITE_SERVER_URL
    const [data, setData] = useState([])
    const chartRef = useRef(null)

    useEffect(() => {
        const handleAttendance = async () => {
            try {
                const response = await fetch(`${serverUrl}/api/attendance`)
                const result = await response.json()
                setData(result)
            } catch (err) {
                console.error('Error fetching attendance:', err)
            }
        }

        handleAttendance()
    }, [serverUrl])

    useEffect(() => {
        if (!data.length || !chartRef.current) return

        // Chart rendering logic
        const barHeight = 25
        const marginTop = 30
        const marginRight = 20
        const marginBottom = 10
        const marginLeft = 200
        const width = 928
        const height = Math.ceil((data.length + 0.1) * barHeight) + marginTop + marginBottom

        const x = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.attendance)])
            .range([marginLeft, width - marginRight])

        const y = d3.scaleBand()
            .domain(d3.sort(data.slice(), d => -d.attendance).map(d => d.centre_name))
            .rangeRound([marginTop, height - marginBottom])
            .padding(0.1)

        const svg = d3.create("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;")

        svg.append("g")
            .attr("fill", "steelblue")
            .selectAll("rect")
            .data(data)
            .join("rect")
            .attr("x", x(0))
            .attr("y", d => y(d.centre_name))
            .attr("width", d => x(d.attendance) - x(0))
            .attr("height", y.bandwidth())

        svg.append("g")
            .attr("fill", "white")
            .attr("text-anchor", "end")
            .selectAll("text")
            .data(data)
            .join("text")
            .attr("x", d => x(d.attendance))
            .attr("y", d => y(d.centre_name) + y.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("dx", -4)
            .text(d => d.attendance)
            .call(text => text.filter(d => x(d.attendance) - x(0) < 20)
                .attr("dx", +4)
                .attr("fill", "black")
                .attr("text-anchor", "start"))

        svg.append("g")
            .attr("transform", `translate(0,${marginTop})`)
            .call(d3.axisTop(x))
            .call(g => g.select(".domain").remove())

        svg.append("g")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y).tickSizeOuter(0))

        // Clear and append chart
        chartRef.current.innerHTML = ""
        chartRef.current.appendChild(svg.node())
    }, [data]) // rerun when data updates

    return (
        <>
            <h1>Average Attendance for 2024</h1>
            <div ref={chartRef}></div>
        </>
    )
}

export default BarChart