import { useTranslation } from 'react-i18next';
import { App, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import viVN from 'antd/locale/vi_VN';
import { AuthProvider } from './context/AuthProvider';
import { FavoritesProvider } from './context/FavoritesProvider';
import { ChatBoxProvider } from './context/ChatBoxContext';
import { LanguageProvider } from './context/LanguageContext';

import { AppRouter } from '@/lib/routers';
import { hexRoomTheme } from '@/lib/antd-theme';

export function AppWithLocale() {
    const { i18n } = useTranslation();
    const antdLocale = i18n.language?.toLowerCase().startsWith('en') ? enUS : viVN;

    return (
        <ConfigProvider theme={hexRoomTheme} locale={antdLocale}>
            <App>
                <LanguageProvider>
                    <AuthProvider>
                        <FavoritesProvider>
                            <ChatBoxProvider>
                                <AppRouter />
                            </ChatBoxProvider>
                        </FavoritesProvider>
                    </AuthProvider>
                </LanguageProvider>
            </App>
        </ConfigProvider>
    );
}
