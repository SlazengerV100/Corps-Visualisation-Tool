import Box from '@mui/material/Box'

export default function DefinitionsPage() {
    return (
        <Box sx={{ width: '100%', height: '100%', p: 3, overflowY: 'auto' }}>
            <h1>Definitions</h1>
            <h2>Growth</h2>
            <p>Growth is calculated using the <strong>congregational worship</strong>, <strong>kids church</strong>, <strong>youth discipleship</strong> and <strong>first time decisions</strong> metrics. A value between 0 and 100 is calculated for each corps in each year.</p>
            <h3>Attendance scores</h3>
            <p>Congregational worship, kids church and youth discipleship are each scored the same way. Each is given a base score relative to its attendance in the current year. The floor for this value is set at 30 points and the cap at 70 points:</p>
            <ul>
                <li>congregational worship: 30 points for 25 people or less, 70 points for 200 people or more</li>
                <li>kids church and youth discipleship: 30 points for 5 people or less, 70 points for 50 people or more</li>
            </ul>
            <p>The base score is then applied a bonus or penalty based upon the increase/decrease compared to the previous year for each of the following:</p>
            <ol>
                <li>the nominal change in attendance, capped at 15 bonus/penalty points</li>
                <li>the percentage change in attendance, capped at 15 bonus points but no cap for penalty. This is so that a 100% decrease results in a score of zero.</li>
            </ol>
            <p>The percentage change bonus is capped at a 10% increase in attendance compared with the previous year. With no attendance in the previous year there is no percentage change bonus or penalty.</p>
            <p>The nominal change cap is an increase or decrease of 10% of the attendance that earns the 70 point cap: 20 people for congregational worship, and 5 people for kids church and youth discipleship.</p>
            <p>Each score is the sum of the base score and the bonus/penalty for the nominal and percentage changes.</p>
            <h3>Missing kids church or youth discipleship</h3>
            <p>A corps that recorded no kids church or youth discipleship in either year is not scored on it, so it is not penalised for not running that programme. A corps that recorded it in only one of the two years is scored as having no attendance in the other.</p>
            <h3>First time decisions score</h3>
            <p>First time decisions vary too much from year to year to score their change, so they are scored on the current year alone, <strong>per person</strong> in congregational worship. No decisions recorded scores 0 points and decisions equal to 10% or more of congregational worship scores 100 points, with values in between scaled evenly. For example, 5 decisions scores 100 points at a corps of 50 people but 25 points at a corps of 200.</p>
            <h3>Growth score</h3>
            <p>The growth score is the weighted average of the four scores: congregational worship at 50%, first time decisions at 20%, and kids church and youth discipleship at 15% each. When kids church or youth discipleship is not scored, the remaining weights are scaled up to fill its share.</p>
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
        </Box>
    )
}