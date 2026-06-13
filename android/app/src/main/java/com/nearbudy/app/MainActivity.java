package com.nearbudy.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        // Handle Google Social Login result
        // Some Android versions/libraries truncate request codes to 16 bits (0-65535)
        int googleMin = GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN;
        int googleMax = GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX;
        int truncatedMin = googleMin & 0xFFFF;
        int truncatedMax = googleMax & 0xFFFF;

        boolean isGoogleRequest = (requestCode >= googleMin && requestCode < googleMax) ||
                                 (requestCode >= truncatedMin && requestCode < truncatedMax);

        if (isGoogleRequest) {
            PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
            if (pluginHandle != null) {
                ((SocialLoginPlugin) pluginHandle.getInstance()).handleGoogleLoginIntent(requestCode, data);
            }
        }
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
    }
}
