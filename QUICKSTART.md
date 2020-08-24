# `QUICKSTART.md`

## Step 1
Update, upgrade, and install packages

```
sudo apt update -qq -y
sudo apt upgrade -qq -y
sudo apt install -qq -y network-manager software-properties-common apparmor-utils apt-transport-https avahi-daemon ca-certificates curl dbus jq socat git
```

## Step 2
Install Home-Assistant

```
curl -sSL -o hassio-install.sh http://raw.githubusercontent.com/dcmartin/motion-ai/master/sh/hassio-install.sh \
  && \
  chmod 755 hassio-install.sh \
  && \
  sudo ./hassio-install.sh \
  || \
  echo "Home-Assistant failed to install" &> /dev/stderr
```

## Step 3
Install HACS

```
curl -sSL -o hacs.zip http://github.com/hacs/integration/releases/latest/download/hacs.zip \
  && \
  mkdir -p /usr/share/hassio/homeassistant/custom_components/hacs/ \
  && \
  unzip hacs.zip -o -d /usr/share/hassio/homeassistant/custom_components/hacs \
  && \
  rm -f hacs.zip \
  || \
  echo "HACS failed to install" &> /dev/stderr
```

## Step 4
Install HACS plugins

Name|Type|Required|Description
:-------|-------:|-------:|-------:|-------:
Card-mod|Module|Yes|Add CSS styles to (almost) any lovelace card
Button-card|Module|Yes |Lovelace button-card for home assistant
Light Entity Card|js|Yes|Control any light or switch entity
auto-entities|Module|Yes|Automatically populate the entities-list of lovelace cards
Custom Header|Module|Yes|Lovelace Custom Header
more-info-card|Module|Yes|Display the more-info dialog of any entity as a lovelace card
state-switch|Module|Yes|Dynamically replace lovelace cards depending on occasion
--------|--------|--------|--------|--------

