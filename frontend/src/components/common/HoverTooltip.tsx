import type { ReactElement, ReactNode } from 'react'
import Tooltip, { type TooltipProps } from '@mui/material/Tooltip'

/**
 * Light tooltip shown on hover, styled like the bubble chart's tooltip rather than MUI's default dark one
 */
export default function HoverTooltip({ title, placement = 'left', children }: {
    title: ReactNode
    placement?: TooltipProps['placement']
    children: ReactElement
}) {
    return (
        <Tooltip
            title={title}
            placement={placement}
            slotProps={{
                tooltip: {
                    sx: {
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        boxShadow: 4,
                        typography: 'body2',
                        p: 1.5,
                        maxWidth: 320
                    }
                }
            }}
        >
            {children}
        </Tooltip>
    )
}
