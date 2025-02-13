import { Theme } from '@mui/material/styles';

export const getSxClasses = (theme: Theme) => ({
  container: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    height: '700px',
  },
  title: {
    textAlign: 'left',
    fontWeight: '600',
    color: theme.palette.geoViewColor.textColor.main,
    fontSize: theme.palette.geoViewFontSize.md,
  },
  subtitle: {
    fontWeight: 'normal',
    fontSize: theme.palette.geoViewFontSize.md,
    textAlign: 'left',
    marginBottom: '15px',
  },
  layersListContainer: {
    padding: '20px',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',

    [theme.breakpoints.down('sm')]: {
      width: '100%',
    },
    [theme.breakpoints.up('md')]: {
      width: '50%',
    },
    [theme.breakpoints.up('lg')]: {
      width: '33.33%',
    },
  },
  legendLayerListItem: {
    padding: '6px 4px',
    '& .layerTitle > .MuiListItemText-primary': {
      fontSize: theme.palette.geoViewFontSize.md,
      fontWeight: '600',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    },

    '& .MuiListItemText-root': {
      marginLeft: '12px',
    },

    '& .MuiCollapse-vertical': {
      marginLeft: '6px',

      '& ul': {
        marginTop: 0,
        padding: 0,
      },
      '& li': {
        borderLeft: `5px solid ${theme.palette.geoViewColor.bgColor.dark[200]}`,
        paddingLeft: '6px',
        marginBottom: '3px',
        fontWeight: '400',

        '&.unchecked': {
          borderLeft: `5px solid ${theme.palette.geoViewColor.bgColor.dark[600]}`,
          fontStyle: 'italic',
          color: theme.palette.geoViewColor.textColor.light[600],
        },
      },
    },
  },
  collapsibleContainer: {
    width: '100%',
    padding: '10px 0',
    margin: '0px 10px',
  },
});
