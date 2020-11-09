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
Install `dwains-dashboard`

```
curl -sSL -o dwainsdashboard.tar.gz https://github.com/dwainscheeren/dwains-lovelace-dashboard/archive/v1.4.1.tar.gz \
  && \
  tar xzf dwainsdashboard.tar.gz -C /usr/share/hassio/homeassistant \
  || \
  echo "dwains-dashboard failed to install" &> /dev/stderr
```

## Step 7
Go to integrations, seach for Dwains Dashboard and install it.

## Step 8
Configure `dwains-dashboard` using files in `./dwains-dashboard/configs/` directory
