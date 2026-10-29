import Box from '@mui/material/Box'

export default function DefinitionsPage() {
    return (
        <Box sx={{ width: '100%', height: '100%', p: 3, overflowY: 'auto' }}>
            <h1>Definitions</h1>
            <h2>Growth</h2>
            <p>Growth is calculated using the <b>congregational worship</b> metric. A value between 0 and 100 is calculated for each corps in each year.</p>
            <p>Each corps is given a base score relative to its size in the current year. The floor for this value is set at 30 points for corps of 25 people or less, and the cap is set at 70 points for corps of 200 people or more.</p>
            <p>The base score is then applied a bonus or penalty based upon the increase/decrease compared to the previous year for each of the following:</p>
            <ol>
                <li>the nominal change in congregational worship, capped at 15 bonus/penalty points</li>
                <li>the percentage change in congregational worship, capped at 15 bonus points but no cap for penalty. This is so that a 100% decrease results in a growth score of zero.</li>
            </ol>
            <p>The percentage change bonus is capped at a 10% increase in congregational worship compared with the previous year.</p>
            <p>The nominal change cap is an increase or decrease of 20 people, which is 10% of the base cap of 200 people.</p>
            <p>The growth score is calculated as the sum of the base score and the bonus/penalty for the nominal and percentage changes.</p>
            <h2>Sustainability</h2>
            <p>Sustainability is calculated using the <strong>tithing</strong> and <strong>surplus/deficit</strong> metrics. A value between 0 and 100 is calculated for each corps in each year.</p>
            <h3>Tithing score</h3>
            <p>Each corps is given a base score relative to the total value of tithing in the current year <strong>per person</strong>. The floor for this value is set at 30 points for corps with tithing of $500/person/year or less, and the cap is set at 70 points for corps of $2,000/person/year or more.</p>
            <p>The base score is then applied a bonus or penalty based upon the increase/decrease compared to the previous year for each of the following:</p>
            <ol>
                <li>the nominal change in tithing, capped at 15 bonus/penalty points</li>
                <li>the percentage change in tithing, capped at 15 bonus points but no cap for penalty. This is so that a 100% decrease results in a tithing score of zero.</li>
            </ol>
            <p>The percentage change bonus is capped at a 10% increase in tithing compared with the previous year. A corps with no tithing in the previous year gets no percentage change bonus or penalty.</p>
            <p>The nominal change cap is an increase or decrease of $40,000, which is 10% of the max congregation size of 200 people multiplied by the max tithing of $2,000/person/year.</p>
            <p>The tithing score is the sum of the base score and the bonus/penalty for the nominal and percentage changes.</p>
            <h3>Surplus/deficit score</h3>
            <p>The surplus/deficit for the year is calculated <strong>per person</strong>. A deficit of $2,000/person or more scores 0 points, breaking even scores 50 points, and a surplus of $2,000/person or more scores 100 points, with values in between scaled evenly.</p>
            <h3>Sustainability score</h3>
            <p>The sustainability score is the average of the tithing score and the surplus/deficit score. A corps with no surplus/deficit figure for the year, or no congregational worship, is scored on tithing alone.</p>
            <h2>Size</h2>
            <p>Size represents the congregational worship metric for each corps in the year selected. This determines the size of the bubbles on the overview page</p>
            <h2>Population</h2>
            <p>Population represents the number of people living in the surrounding area of the corps using the latest data from the NZ Census.</p>
        </Box>
    )
}