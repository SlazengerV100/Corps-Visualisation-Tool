import type { ReactNode } from 'react'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import HoverTooltip from '../common/HoverTooltip.tsx'
import { gapColours, type FigureGap } from '../common/figureGaps.ts'
import type { BubblePoint } from './BubbleChart.tsx'

export interface ChangeBreakdown {
    band: number
    nominal: number
    percentage: number
}

const formatPart = (value: number) => value.toFixed(1)
const formatChange = (value: number) => `${value < 0 ? '−' : '+'} ${Math.abs(value).toFixed(1)}`
const dollars = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
const formatSurplusDeficit = (value: number | null) => {
    if (value === null) return 'No figure this year'
    if (value === 0) return 'Broke even'
    return `${dollars.format(Math.abs(value))} ${value < 0 ? 'deficit' : 'surplus'}`
}

// A coloured row explains on hover how its missing figure was scored
const GapRow = ({ gap, why, children }: { gap?: FigureGap, why?: string, children: ReactNode }) => {
    if (!gap) return <TableRow>{children}</TableRow>
    return (
        <HoverTooltip title={why}>
            <TableRow sx={{ cursor: 'help', '& td': { color: gapColours[gap] } }}>{children}</TableRow>
        </HoverTooltip>
    )
}

const ChangeRow = ({ label, parts, gap, why }: { label: string, parts: ChangeBreakdown, gap?: FigureGap, why?: string }) => (
    <GapRow gap={gap} why={why}>
        <TableCell>{label}</TableCell>
        <TableCell align="right">{formatPart(parts.band)}</TableCell>
        <TableCell align="right">{formatChange(parts.nominal)}</TableCell>
        <TableCell align="right">{formatChange(parts.percentage)}</TableCell>
        <TableCell align="right">{formatPart(parts.band + parts.nominal + parts.percentage)}</TableCell>
    </GapRow>
)

const NoteRow = ({ label, note, score, gap, why }: { label: string, note: string, score: number | null, gap?: FigureGap, why?: string }) => (
    <GapRow gap={gap} why={why}>
        <TableCell>{label}</TableCell>
        <TableCell colSpan={3} sx={{ fontStyle: 'italic' }}>{note}</TableCell>
        <TableCell align="right">{score === null ? '–' : formatPart(score)}</TableCell>
    </GapRow>
)

const TotalRow = ({ label, score }: { label: string, score: number }) => (
    <TableRow sx={{ '& td': { fontWeight: 'bold', pt: 1 } }}>
        <TableCell colSpan={4}>{label}</TableCell>
        <TableCell align="right">{score}</TableCell>
    </TableRow>
)

/**
 * A bubble's growth and sustainability scores, each broken into the parts behind it
 */
export default function ScoreBreakdown({ point, title, labels }: { point: BubblePoint, title: string, labels: Record<string, string> }) {
    const { growth, sustainability } = point.breakdown
    const programme = (name: 'kidsChurch' | 'youthDiscipleship') => {
        const parts = growth[name]
        const gap = point.gaps[name]
        if (!parts) {
            return <NoteRow label={labels[name]} note="Not recorded either year" score={null} gap={gap}
                why="Not recorded in either year, so it is left out of growth rather than counted against it." />
        }
        const why = gap === 'thisYear'
            ? 'Not recorded this year, so it counts as zero.'
            : 'Not recorded last year, so the change is measured from zero and there is no percentage change.'
        return <ChangeRow label={labels[name]} parts={parts} gap={gap} why={why} />
    }
    return (
        <>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{title} · {labels.congregationalWorship} of {Math.round(point.size)}</Typography>
            <Table size="small" sx={{ '& td, & th': { border: 0, py: 0.25, px: 0.75 } }}>
                <TableHead>
                    <TableRow>
                        <TableCell />
                        <TableCell align="right">Band</TableCell>
                        <TableCell align="right">Change</TableCell>
                        <TableCell align="right">% change</TableCell>
                        <TableCell align="right">Score</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TotalRow label="Growth" score={point.growth} />
                    <ChangeRow label={labels.congregationalWorship} parts={growth.congregationalWorship} />
                    <NoteRow
                        label={labels.firstTimeDecisions}
                        note={`${point.firstTimeDecisions} decision${point.firstTimeDecisions === 1 ? '' : 's'}`}
                        score={growth.firstTimeDecisions}
                        gap={point.gaps.firstTimeDecisions}
                        why="No first-time decisions recorded this year, so it counts as none."
                    />
                    {programme('kidsChurch')}
                    {programme('youthDiscipleship')}
                    <TotalRow label="Sustainability" score={point.sustainability} />
                    <ChangeRow
                        label={labels.tithing}
                        parts={sustainability.tithing}
                        gap={point.gaps.tithing}
                        why="No tithing figure last year, so the change is measured from $0 and there is no percentage change."
                    />
                    <NoteRow
                        label={labels.surplusDeficit}
                        note={formatSurplusDeficit(point.surplusDeficit)}
                        score={sustainability.surplusDeficit}
                        gap={point.gaps.surplusDeficit}
                        why="No surplus/deficit figure this year, so sustainability comes from tithing alone."
                    />
                </TableBody>
            </Table>
        </>
    )
}
