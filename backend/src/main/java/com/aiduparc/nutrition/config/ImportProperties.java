package com.aiduparc.nutrition.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "nutrition.import")
public class ImportProperties {
    private boolean enabled;
    private String csvPath;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getCsvPath() { return csvPath; }
    public void setCsvPath(String csvPath) { this.csvPath = csvPath; }
}
