import type { ThemeConfig } from 'antd';

/** HexRoom Modern Emerald Green Design Tokens */
export const hexRoomTheme: ThemeConfig = {
  token: {
    colorPrimary: '#10B981', // Modern vibrant Emerald Green
    colorPrimaryHover: '#059669',
    colorPrimaryActive: '#047857',
    colorSuccess: '#16A34A',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorInfo: '#10B981',
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F8FAF9',
    colorBorder: '#E2E8F0',
    colorBorderSecondary: '#F1F5F9',
    colorText: '#0F172A',
    colorTextSecondary: '#64748B',
    borderRadius: 14,
    borderRadiusLG: 18,
    borderRadiusSM: 10,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    motionDurationSlow: '0.2s',
    motionDurationMid: '0.15s',
    motionDurationFast: '0.1s',
    controlHeight: 42,
    controlHeightLG: 48,
  },
  components: {
    Button: {
      borderRadius: 12,
      fontWeight: 600,
      primaryShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.35)',
      defaultShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    },
    Input: {
      borderRadius: 12,
      activeBorderColor: '#10B981',
      hoverBorderColor: '#10B981',
    },
    Select: {
      borderRadius: 12,
      optionSelectedBg: 'rgba(16, 185, 129, 0.1)',
    },
    Card: {
      borderRadiusLG: 18,
    },
    Drawer: {
      padding: 20,
    },
    Badge: {
      colorBgContainer: '#FFFFFF',
    },
    Tabs: {
      itemSelectedColor: '#059669',
      itemHoverColor: '#10B981',
      inkBarColor: '#10B981',
    },
    Tag: {
      borderRadiusSM: 8,
    },
  },
};
