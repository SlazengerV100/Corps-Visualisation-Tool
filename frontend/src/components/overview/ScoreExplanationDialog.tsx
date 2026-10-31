import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'

// The concepts every score is measured against, defined once and then referred to by name
const shared = (
    <>
        <Typography sx={{ mb: 2 }}>
            Growth and sustainability are each a rating from 0 to 100, scored every year by comparing a corps with the year before.
            Both are measured against reference points chosen for this tool, which are a judgement rather than official definitions.
        </Typography>
        <Typography variant="subtitle1" component="h3">Small and large corps</Typography>
        <Typography sx={{ mb: 2 }}>
            A small corps has 25 people attending congregational worship each week, and a large corps has 200.
            For kids church and youth discipleship, both are 20% of that.
        </Typography>
        <Typography variant="subtitle1" component="h3">Significant growth</Typography>
        <Typography sx={{ mb: 2 }}>
            A change of 10% on last year is significant growth, or significant decline when it is a fall.
        </Typography>
        <Typography variant="subtitle1" component="h3">Band, change and percentage change</Typography>
        <Typography component="div">
            Congregational worship, kids church, youth discipleship and tithing are each rated from three parts. The band places
            a corps between 30 and 70 on the rating, and the change and percentage change then add a bonus or penalty.
            <ul>
                <li>
                    <strong>Band:</strong> if you are at or worse than a small corps, you are at the bottom of the band. If you are at or
                    above a large corps, you are at the top. The rest of the corps fit somewhere in between.
                </li>
                <li>
                    <strong>Change:</strong> a bonus or penalty of up to 15 points for the change in numbers on last year, with the full
                    bonus or penalty for significant growth or decline in a large corps.
                </li>
                <li>
                    <strong>Percentage change:</strong> a bonus of up to the same limit, with the full bonus for significant growth and
                    smaller growth raising the score by the same percentage. The penalty is uncapped: a fall takes the same percentage off
                    the score, so a 100% decline scores 0. With nothing recorded last year there is no percentage change.
                </li>
            </ul>
        </Typography>
        <Typography sx={{ mb: 2 }}>
            <strong>A large corps with significant growth earns the full bonus for both, and scores 100.</strong>
        </Typography>
    </>
)

const growth = (
    <>
        <Typography variant="subtitle1" component="h3">Growth</Typography>
        <Typography sx={{ mb: 2 }}>
            Growth measures whether a corps is growing. It combines a score for each of congregational worship, kids church,
            youth discipleship and first-time decisions.
        </Typography>
        <Typography sx={{ mb: 2 }}>
            A corps that recorded no kids church or youth discipleship in either year is not scored on it.
            One recorded in only one of the two years counts as zero in the other.
        </Typography>
        <Typography variant="subtitle2" component="h4">First-time decisions</Typography>
        <Typography sx={{ mb: 2 }}>
            First-time decisions vary too much from year to year to score their change, so they are scored on this year alone,
            per attendee: from the bottom of the rating for none to the top for one decision per ten attendees or more.
        </Typography>
    </>
)

const sustainability = (
    <>
        <Typography variant="subtitle1" component="h3">Sustainability</Typography>
        <Typography sx={{ mb: 2 }}>
            Sustainability measures whether a corps can sustain itself financially. It combines a score for tithing and one for
            surplus/deficit, both per attendee at congregational worship.
        </Typography>
        <Typography variant="subtitle2" component="h4">Tithing</Typography>
        <Typography sx={{ mb: 2 }}>
            Tithing of $500 per attendee a year or less is at the bottom of the band, and $2,000 or more at the top: roughly one in
            sixteen and one in four attendees tithing on the New Zealand median income of $80,000. The full change points are
            significant growth for a large corps where everyone gives $2,000.
        </Typography>
        <Typography variant="subtitle2" component="h4">Surplus/deficit</Typography>
        <Typography sx={{ mb: 2 }}>
            A deficit of $2,000 per attendee or more is at the bottom of the rating, breaking even is in the middle, and a surplus
            of $2,000 or more is at the top.
            A corps with no surplus/deficit figure, or no congregational worship, is scored on tithing alone.
        </Typography>
    </>
)

/**
 * Popup explaining how every score works, then in detail how growth and sustainability are calculated
 */
export default function ScoreExplanationDialog({ open, onClose }: { open: boolean, onClose: () => void }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md">
            <DialogTitle variant="h5" sx={{ pr: 6, fontWeight: 'bold' }}>How the scores are calculated</DialogTitle>
            <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
                <CloseIcon />
            </IconButton>
            <DialogContent sx={{ '& h3, & h4': { fontWeight: 'bold' } }}>
                {shared}
                <Divider sx={{ my: 2 }} />
                {growth}
                <Divider sx={{ my: 2 }} />
                {sustainability}
            </DialogContent>
        </Dialog>
    )
}
