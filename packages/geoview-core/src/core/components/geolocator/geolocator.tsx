import { ChangeEvent, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import debounce from 'lodash/debounce';
import { CloseIcon, SearchIcon, AppBar, Box, Divider, IconButton, ProgressBar, Toolbar } from '@/ui';
import { StyledInputField, sxClasses } from './geolocator-style';
import { OL_ZOOM_DURATION } from '@/core/utils/constant';
import { useUIAppbarGeolocatorActive } from '@/core/stores/store-interface-and-intial-values/ui-state';
import { useAppGeolocatorServiceURL, useAppDisplayLanguage } from '@/core/stores/store-interface-and-intial-values/app-state';
import { GeolocatorResult } from './geolocator-result';
import { logger } from '@/core/utils/logger';

export interface GeoListItem {
  key: string;
  name: string;
  lat: number;
  lng: number;
  bbox: [number, number, number, number];
  province: string;
  category: string;
}

export function Geolocator() {
  // Log
  logger.logTraceRender('components/geolocator/geolocator');

  const { t } = useTranslation();

  // internal state
  const [data, setData] = useState<GeoListItem[]>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>('');
  const [isSearchInputVisible, setIsSearchInputVisible] = useState<boolean>(false);

  // get store values
  const displayLanguage = useAppDisplayLanguage();
  const geolocatorServiceURL = useAppGeolocatorServiceURL();

  // set the active (visible) or not active (hidden) from geolocator button click
  const active = useUIAppbarGeolocatorActive();

  const urlRef = useRef<string>(`${geolocatorServiceURL}&lang=${displayLanguage}`);

  /**
   * Send fetch call to the service for given search term.
   * @param {string} searchTerm the search term entered by the user
   * @returns void
   */
  const getGeolocations = async (searchTerm: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${urlRef.current}&q=${encodeURIComponent(`${searchTerm}*`)}`);
      if (!response.ok) {
        throw new Error('Error');
      }
      const result = (await response.json()) as GeoListItem[];
      setIsLoading(false);
      setData(result);
    } catch (err) {
      setIsLoading(false);
      setError(err as Error);
    }
  };

  /**
   * Reset search component values when close icon is clicked.
   * @returns void
   */
  const resetSearch = useCallback(() => {
    setIsSearchInputVisible(false);
    setSearchValue('');
    setData(undefined);
  }, []);

  /**
   * Do service request after debouncing.
   * @returns void
   */
  const doRequest = debounce((searchTerm: string) => {
    getGeolocations(searchTerm);
  }, OL_ZOOM_DURATION);

  /**
   * Debounce the get geolocation service request
   * @param {string} searchTerm value to be searched
   * @returns void
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedRequest = useCallback((searchTerm: string) => doRequest(searchTerm), []);

  /**
   * onChange handler for search input field
   * @param {ChangeEvent<HTMLInputElement>} e HTML Change event handler
   * @returns void
   */
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setSearchValue(value);
    if (value.length) {
      debouncedRequest(value);
    }
    // clear geo list when search term cleared from input field.
    if (!value.length && data?.length) {
      setData(undefined);
    }
  };

  return (
    <Box sx={sxClasses.root} visibility={active ? 'visible' : 'hidden'} id="geolocator-search">
      <Box sx={sxClasses.geolocator}>
        <AppBar position="static">
          <Toolbar
            variant="dense"
            // attach event handler to toolbar when search input is hidden.
            {...(!isSearchInputVisible && { onClick: () => setIsSearchInputVisible(true) })}
            sx={{ cursor: !isSearchInputVisible ? 'pointer' : 'default' }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                // cancel the debounce fn, when enter key clicked before wait time.
                doRequest.cancel();
                getGeolocations(searchValue);
              }}
            >
              {isSearchInputVisible && (
                <StyledInputField placeholder={t('geolocator.search')!} autoFocus onChange={onChange} value={searchValue} />
              )}

              <Box sx={{ display: 'flex', marginLeft: 'auto', alignItems: 'center' }}>
                <IconButton
                  size="small"
                  edge="end"
                  color="inherit"
                  sx={{ mr: 4 }}
                  disabled={isSearchInputVisible && !searchValue.length}
                  onClick={() => {
                    if (!isSearchInputVisible) {
                      setIsSearchInputVisible(true);
                    } else if (searchValue.length) {
                      doRequest.cancel();
                      getGeolocations(searchValue);
                    }
                  }}
                >
                  <SearchIcon fontSize="small" />
                </IconButton>
                {isSearchInputVisible && (
                  <>
                    <Divider orientation="vertical" variant="middle" flexItem />
                    <IconButton size="small" edge="end" color="inherit" sx={{ mr: 2, ml: 4 }} onClick={resetSearch}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </Box>
            </form>
          </Toolbar>
        </AppBar>
      </Box>
      {isLoading && (
        <Box sx={sxClasses.progressBar}>
          <ProgressBar />
        </Box>
      )}
      {!!data && (
        <Box sx={sxClasses.searchResult}>
          <GeolocatorResult geoLocationData={data} searchValue={searchValue} error={error} />
        </Box>
      )}
    </Box>
  );
}
