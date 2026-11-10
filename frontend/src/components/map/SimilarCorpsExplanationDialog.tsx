import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'

// What makes corps similar and how the score reads, the same for every match
const shared = (
    <>
        <Typography sx={{ mb: 2 }}>
            Similar corps were once where this corps is now. Each is found by comparing this corps' most recent years with every
            earlier run of years of the same length, from any corps in the same region, New Zealand or the Pacific. This corps'
            own earlier years count too.
        </Typography>
        <Typography variant="subtitle1" component="h3">Similarity</Typography>
        <Typography sx={{ mb: 2 }}>
            Similarity is a score from 50 to 100. Years with identical figures score 100, and the score falls the further apart
            they are. Anything below 50 isn't shown. Up to three corps are shown, each only once, closest first, and the circle
            runs from red at 50 to green at 100.
        </Typography>
        <Typography variant="subtitle1" component="h3">Comparing figures</Typography>
        <Typography sx={{ mb: 2 }}>
            Figures are compared by proportion rather than amount, so going from 30 to 60 people counts about the same as going
            from 150 to 300, and every metric counts equally. A corps' figures are only compared with years that had worship,
            and a match also needs worship in as many years after its run as the run covers, so it shows what happened next.
        </Typography>
        <Typography variant="subtitle1" component="h3">The national trend</Typography>
        <Typography sx={{ mb: 2 }}>
            Every figure but surplus/deficit is measured against its region's trend that year: the change in the total across
            the corps that reported in both that year and the one before, so openings and closures don't move it. A corps from
            2005 and one from 2025 are then compared by how they stood against everyone else at the time, and tithing loses
            the effect of inflation.
        </Typography>
        <Typography variant="subtitle1" component="h3">Missing figures</Typography>
        <Typography>
            SAMIS can't tell a zero from a figure left blank, so a zero for worship, first-time decisions, kids church or youth
            counts as missing. Missing figures are left out of the comparison rather than counted as a match or a difference.
        </Typography>
    </>
)

const overallExplanation = (years: number) => (
    <>
        <Typography variant="subtitle1" component="h3">Across every metric</Typography>
        <Typography>
            These corps are compared on all six metrics together over the last {years} years, so they are the closest overall.
            Each metric in Metrics History also has its own similar corps.
        </Typography>
    </>
)

const perMetricExplanation = (years: number) => (
    <>
        <Typography variant="subtitle1" component="h3">On the selected metric</Typography>
        <Typography sx={{ mb: 2 }}>
            These corps are compared on the selected metric alone, over the last {years} years, so they can
            differ from the similar corps across every metric. Both corps need a figure for the metric in every one of those years.
            First-time decisions only count towards the similar corps across every metric.
        </Typography>
        <Typography variant="subtitle1" component="h3">The projection</Typography>
        <Typography sx={{ mb: 2 }}>
            FUTURE projects {years} years ahead. Each similar corps went up or down against the national trend in the years
            after the run it matched, and the dotted line applies those changes to this corps' latest figure, giving closer
            corps more say. The national trend then carries on at its average yearly change over the last {years} years. Each
            similar corps' own path is drawn alongside.
            Surplus/deficit follows the similar corps' surplus or deficit per worshipper, applied to the projected worship. A
            year is only projected when at least two similar corps have a figure for it.
        </Typography>
        <Typography variant="subtitle1" component="h3">The shaded band</Typography>
        <Typography sx={{ mb: 2 }}>
            The same projection was run for every corps as at each past year, and compared with what then happened. The band
            holds the middle 80% of those outcomes for each year ahead, so it widens the further ahead it goes. It leans
            downward because past projections ran high: corps more often ended up smaller than projected.
        </Typography>
        <Typography variant="subtitle1" component="h3">COVID</Typography>
        <Typography>
            COVID cut attendance across the territory, most of all in 2021/22, so it falls in this corps' recent years and can
            fall in a similar corps' years or what followed them.
        </Typography>
    </>
)

/**
 * Popup explaining how similar corps are found, then either the overall match across every metric or the per-metric match and its projection, over the given years
 */
export default function SimilarCorpsExplanationDialog({ open, onClose, perMetric, years }: { open: boolean, onClose: () => void, perMetric: boolean, years: number | null }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md">
            <DialogTitle variant="h5" sx={{ pr: 6, fontWeight: 'bold' }}>How similar corps are found</DialogTitle>
            <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
                <CloseIcon />
            </IconButton>
            <DialogContent sx={{ '& h3': { fontWeight: 'bold' } }}>
                {shared}
                <Divider sx={{ my: 2 }} />
                {years !== null && (perMetric ? perMetricExplanation(years) : overallExplanation(years))}
            </DialogContent>
        </Dialog>
    )
}
