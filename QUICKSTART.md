# `QUICKSTART.md`
This _quick start_ is suitable for the following:

+ Ubuntu 18.04 systems on `amd64` and `aarch64` (e.g. nVidia Jetson Nano)
+ Rasbian Buster on `armv7` (e.g. RaspberryPi models 3 & 4)

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
  unzip -qq -f -d /usr/share/hassio/homeassistant/custom_components/hacs hacs.zip \
  && \
  rm -f hacs.zip \
  || \
  echo "HACS failed to install" &> /dev/stderr
```

## Step 4
Get a _personal access token_ for your Github account.

```
hacs:
  token: xxxcdxfxabxxabxxcafxcbcxxxxxxcxxxexxdxff
```

## Step 5
Install HACS _frontend_ plugins

Name|Type|Required|Description|
:-------|-------|-------|:-------
Card-mod|Module|Yes|Add CSS styles to (almost) any lovelace card
Button-card|Module|Yes |Lovelace button-card for home assistant
Light Entity Card|js|Yes|Control any light or switch entity
auto-entities|Module|Yes|Automatically populate the entities-list of lovelace cards
Custom Header|Module|Yes|Lovelace Custom Header
more-info-card|Module|Yes|Display the more-info dialog of any entity as a lovelace card
state-switch|Module|Yes|Dynamically replace lovelace cards depending on occasion

## Step 5
Install `dwains-theme`

```
curl -sSL -o dwainstheme.tar.gz https://github.com/dwainscheeren/lovelace-dwains-theme/archive/v1.4.1.tar.gz \
  && \
  tar xzf dwainstheme.tar.gz -C /usr/share/hassio/homeassistant \
  || \
  echo "dwains-theme failed to install" &> /dev/stderr
```

## Step 6
Configure Home-Assistant to use `dwains-theme` (n.b. starting with _default_ `configuration.yaml`)

```
cd /usr/share/hassio/homeassistant
mv ./dwains-theme/configs-sample/ ./dwains-theme/configs/
echo 'homeassistant:' >> ./configuration.yaml
echo '  packages: !include_dir_named packages/' >> ./configuration.yaml
```

## Step 7
Configure `dwains-theme` using files in `./dwains-theme/configs/` directory

```
```
