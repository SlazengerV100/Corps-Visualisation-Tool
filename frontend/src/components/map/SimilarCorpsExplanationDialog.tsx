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
        <Typography variant="subtitle1" component="h3">Missing figures</Typography>
        <Typography>
            SAMIS can't tell a zero from a figure left blank, so a zero for worship, first-time decisions, kids church or youth
            counts as missing. Missing figures are left out of the comparison rather than counted as a match or a difference.
        </Typography>
    </>
)

const overallExplanation = (
    <>
        <Typography variant="subtitle1" component="h3">Across every metric</Typography>
        <Typography>
            These corps are compared on all six metrics together over the last five years, so they are the closest overall. Each
            metric in Metrics History also has its own similar corps.
        </Typography>
    </>
)

const perMetricExplanation = (
    <>
        <Typography variant="subtitle1" component="h3">On the selected metric</Typography>
        <Typography sx={{ mb: 2 }}>
            These corps are compared on the selected metric alone, over the number of years chosen on the slider, so they can
            differ from the similar corps across every metric. Both corps need a figure for the metric in every one of those years.
            First-time decisions only count towards the similar corps across every metric.
        </Typography>
        <Typography variant="subtitle1" component="h3">The projection</Typography>
        <Typography sx={{ mb: 2 }}>
            FUTURE projects as many years ahead as the slider compares. Each similar corps went up or down by some proportion in
            the years after the run it matched, and the dotted line applies those changes to this corps' latest figure, giving
            closer corps more say. The shaded band shows how much the similar corps disagree, and each one's own path is drawn
            alongside. Surplus/deficit follows the similar corps' surplus or deficit per worshipper, applied to the projected
            worship. A year is only projected when at least two similar corps have a figure for it.
        </Typography>
        <Typography variant="subtitle1" component="h3">Longer comparisons and COVID</Typography>
        <Typography>
            COVID cut attendance across the territory, most of all in 2021/22. Comparing two years keeps it out of this corps'
            own years, though a similar corps' years can still fall in it. Longer comparisons include it in this corps' own years
            too.
        </Typography>
    </>
)

/**
 * Popup explaining how similar corps are found, then either the overall match across every metric or the per-metric match and its projection
 */
export default function SimilarCorpsExplanationDialog({ open, onClose, perMetric }: { open: boolean, onClose: () => void, perMetric: boolean }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md">
            <DialogTitle variant="h5" sx={{ pr: 6, fontWeight: 'bold' }}>How similar corps are found</DialogTitle>
            <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
                <CloseIcon />
            </IconButton>
            <DialogContent sx={{ '& h3': { fontWeight: 'bold' } }}>
                {shared}
                <Divider sx={{ my: 2 }} />
                {perMetric ? perMetricExplanation : overallExplanation}
            </DialogContent>
        </Dialog>
    )
}
