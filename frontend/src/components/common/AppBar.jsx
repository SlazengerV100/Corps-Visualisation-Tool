import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { Link, useLocation } from 'react-router-dom'

export default function ButtonAppBar() {
    const location = useLocation()
    const isActive = (path) => location.pathname === path

    return (
        <Box>
            <AppBar>
                <Toolbar sx={{ display: 'flex', gap: 2 }}>
                    <img
                        src="https://www.salvationarmy.org.nz/wp-content/uploads/2024/06/cropped-cropped-tsa-redshield-icon-512-32x32.png"
                        alt="Corps Analytics Logo"
                        style={{
                            height: 32,
                            marginRight: 16,
                        }}
                    />
                    <Typography variant="h6" component="div">
                        Corps Analytics
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                        <Button
                            component={Link}
                            to="/"
                            color="inherit"
                            variant={isActive('/') ? 'outlined' : 'text'}
                            sx={{ fontFamily: 'inherit' }}
                        >
                            Overview
                        </Button>
                        <Button
                            component={Link}
                            to="/map"
                            color="inherit"
                            variant={isActive('/map') ? 'outlined' : 'text'}
                            sx={{ fontFamily: 'inherit' }}
                        >
                            Map
                        </Button>
                        <Button
                            component={Link}
                            to="/demographics"
                            color="inherit"
                            variant={isActive('/demographics') ? 'outlined' : 'text'}
                            sx={{ fontFamily: 'inherit' }}
                        >
                            Demographics
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>
        </Box>
    )
}
