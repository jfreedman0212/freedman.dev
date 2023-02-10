---
title: "How I Set Up My Server"
tagline: "If I don't write about this now, I will forget everything in 6 months."
datePosted: 2023-02-05T05:12:02.634Z
tags: ["apache","linode","cgit","linux"]
---
I love jotting things down on sticky notes. They're great for getting little thoughts out and
sticking them around as little reminders or notes. Unfortunately, they're best used for
things that are ephemeral. I... wrote all my notes for how to set up this blog and server
on sticky notes, and I'd like to refer back to them someday. So, this is a compilation of all
my sticky notes.

NOTE: If you're trying to follow this as a tutorial, keep in mind that I'm running Debian 11
on my server. There are plenty of great other options for Linux distros, but choosing Debian
dictates your choice in package manager. If you're using a different package manager, swap out
any `apt`-specific commands to your package manager of choice.

# Preliminary Steps

1. Buy a domain (duh)
2. Rent a VPS somewhere (I run this on [Linode](https://www.linode.com/) for $5 per month)

# Set Up the Server

Before we can start serving content, we need to set up sane user permissions. We don't want anyone
to log in as `root` (including us) via SSH, so we need to make our own account first.

```shell
# on local machine
ssh root@[host]
# on remote server, as root
apt update && apt upgrade
dpkg-reconfigure tzdata
hostnamectl set-hostname [name]
useradd -m [user] sudo --password [password] --shell bash
```

First, we update all system dependencies to their latest version (say, if we were using an older install) via 
`apt update && apt upgrade`. Then, we configure other system information like the timezone
(`dpkg-reconfigure tzdata`)[^1] and the host name (`hostnamectl set-hostname [name]`)[^2]. Finally, we
create a new user account that we'll use as our primary login account. No more running or logging as `root`.

# Configure SSH and Firewall

With our own account made, we can restrict root access and set up a firewall. As root, set the following
values in `/etc/sshd.config`:

```
PasswordAuthentication no
PermitRootLogin no
AddressFamily inet
```

`PasswordAuthentication no` forces the use of SSH keys for authentication, `PermitRootLogin no` prevents
someone from running `ssh root@[host]`, and `AddressFamily inet` forces SSH to be over IPv4[^3]. Check
out the [sshd_config](https://www.man7.org/linux/man-pages/man5/sshd_config.5.html) man pages for more
information.

Restart SSH to have it reflect your new changes via:
```shell
sudo systemctl restart sshd
```

## `ufw`

`ufw` (uncomplicated firewall) is the firewall tool we'll be using. We'll install it and configure it
to be only as open as we need it:

```shell
sudo apt-get install ufw
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw default deny incoming
sudo ufw enable
sudo ufw logging on
```

At least via TCP, `ufw` allows us to choose whether to block incoming or outgoing ports. We need SSH on
(which listens on port 22), so we allow that. Any other incoming connections are blocked. Then, we have
to enable the firewall, and optionally enable logging.

## `fail2ban`

TODO: write about fail2ban

[^1]: This was already the appropriate default, so this may not be necessary.
[^2]: I don't remember this working for me (not sure what the issue was), so I didn't run it. Linode suggests it, though.
[^3]: Might be a good idea to allow SSH over IPv6 too. I don't remember why I explicitly set this option.


