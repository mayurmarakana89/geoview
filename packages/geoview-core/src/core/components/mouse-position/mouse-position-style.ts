import { Theme } from '@mui/material/styles';

export const getSxClasses = (theme: Theme) => ({
  mousePosition: {
    display: 'flex',
    minWidth: 'fit-content',
    padding: theme.spacing(0, 4),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    alignItems: 'center',
    width: 'auto',
    backgroundColor: 'transparent !important',
    height: 'inherit !important',
    color: theme.palette.geoViewColor.white,
    lineHeight: 1.5,
    ':hover': {
      backgroundColor: 'transparent !important',
      color: theme.palette.geoViewColor.white,
    },
  },
  mousePositionTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.down('md')]: {
      display: 'none',
    },
  },
  mousePositionTextCheckmarkContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    '& span': {
      fontSize: theme.typography.fontSize,
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    },
  },
  mousePositionCheckmark: {
    paddingRight: 5,
  },
  mousePositionText: {
    fontSize: theme.typography.fontSize,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
});
