import React from 'react';
import { Badge } from '@mui/material';

const NotificationBadge = ({ count }) => {
    return (
        <Badge 
            badgeContent={count} 
            color="error"
            max={99}
            sx={{
                '& .MuiBadge-badge': {
                    backgroundColor: '#FF4B4B',
                    color: 'white',
                    fontSize: '12px',
                    height: '20px',
                    minWidth: '20px',
                    borderRadius: '10px',
                }
            }}
        >
            <i className="fas fa-bell" style={{ fontSize: '24px', color: '#555' }}></i>
        </Badge>
    );
};

export default NotificationBadge;