import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { Link, useLocation } from 'react-router-dom'
import { useTheme, type SxProps, type Theme } from '@mui/material/styles'

// Navigation button style using MUI theme
const navButtonSx = (active: boolean): SxProps<Theme> => theme => ({
    fontFamily: 'inherit',
    border: active 
        ? `1px solid ${theme.palette.common.white}` // Full opacity white border
        : '1px solid transparent',
    borderRadius: theme.shape.borderRadius,
    transition: theme.transitions.create(['border-color', 'background-color'], {
        duration: theme.transitions.duration.short
    }),
    '&:hover': {
        backgroundColor: theme.palette.action.hover
    },
    '&:active': {
        backgroundColor: theme.palette.action.selected,
        borderColor: theme.palette.common.white
    }
})

export default function ButtonAppBar() {
    const location = useLocation()
    const theme = useTheme()
    const isActive = (path: string) => location.pathname === path

    return (
        <Box>
            <AppBar sx={{ backgroundColor: theme.palette.primary.main }}>
                <Toolbar sx={{ display: 'flex', gap: 2 }}>
                    <img
                        src="https://www.salvationarmy.org.nz/wp-content/uploads/2024/06/cropped-cropped-tsa-redshield-icon-512-32x32.png"
                        alt="Corps Analytics Logo"
                        style={{
                            height: 32,
                            marginRight: 16,
                        }}
                        color={theme.palette.primary.main}
                    />
                    <Typography variant="h6" component="div">
                        Corps Analytics
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                        <Button
                            component={Link}
                            to="/"
                            color="inherit"
                            variant="text"
                            sx={navButtonSx(isActive('/'))}
                        >
                            Overview
                        </Button>
                        <Button
                            component={Link}
                            to="/map"
                            color="inherit"
                            variant="text"
                            sx={navButtonSx(isActive('/map'))}
                        >
                            Map
                        </Button>
                        <Button
                            component={Link}
                            to="/definitions"
                            color="inherit"
                            variant="text"
                            sx={navButtonSx(isActive('/definitions'))}
                        >
                            Definitions
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>
        </Box>
    )
}
