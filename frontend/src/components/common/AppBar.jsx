import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'

export default function ButtonAppBar() {
    return (
        <Box>
            <AppBar position="static">
                <Toolbar>
                    <img
                        src="https://www.salvationarmy.org.nz/wp-content/uploads/2024/06/cropped-cropped-tsa-redshield-icon-512-32x32.png"
                        alt="Corps Analytics Logo"
                        style={{
                            height: 32,
                            marginRight: 16,
                        }}
                    />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Corps Analytics
                    </Typography>
                </Toolbar>
            </AppBar>
        </Box>
    );
}
