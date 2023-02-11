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

# Set up Secure Defaults

Before we can start serving content, we need to set up sane user permissions. We don't want anyone
to log in as `root` (including us) via SSH, so we need to make our own account first. All of these
tasks come from [Linode's setup documentation](https://www.linode.com/docs/products/compute/compute-instances/guides/set-up-and-secure/).

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

Next, we'll copy our SSH public key (here are [instructions](https://git-scm.com/book/en/v2/Git-on-the-Server-Generating-Your-SSH-Public-Key) for setting one up):

```shell
# on your local machine
ssh-copy-id [user]@[host]
# this will prompt you for your password
```

Then you're done! Log out of root and log back in using your newly-created account.

## Configure SSH and Firewall

With our own account made, we can restrict root access and set up a firewall. As root, set the following
values in `/etc/sshd.config`:

```
PasswordAuthentication no
PermitRootLogin no
AddressFamily inet
```

`PasswordAuthentication no` forces the use of SSH keys for authentication, `PermitRootLogin no` prevents
someone from running `ssh root@[host]`, and `AddressFamily inet` forces SSH to be over IPv4[^3]. Check
out the [sshd config](https://www.man7.org/linux/man-pages/man5/sshd_config.5.html) man pages for more
information.

Restart SSH to have it reflect your new changes via:
```shell
sudo systemctl restart sshd
```

### `ufw`

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
to enable the firewall, and optionally enable logging. Since this will be a web server, we'll need to
open up some more ports, but we'll do that later.

### `fail2ban`

TODO: write about fail2ban

# Git Setup

My server also houses my Git repositories, which has push/pull access via SSH.
Roughly, this advice follows the Git book's advice for [Git Servers](https://git-scm.com/book/en/v2/Git-on-the-Server-Setting-Up-the-Server). We'll create a user to do all Git operations, then create a folder for
the repositories to live:

```shell
# in case git isn't installed already (wasn't for me)
sudo apt-get install git
sudo useradd -m git
sudo mkdir /srv/git
sudo chown git:git /srv/git
sudo chmod a-rwx /srv/git
sudo chmod u+rwx /srv/git
sudo chmod g+rx /srv/git
```

Next, we need to allow ourselves to use the `git` user via SSH, which we'll do by copying our public key
from our account into `git` user's account:

```shell
cp ~/.ssh/authorized_keys /home/git/.ssh/authorized_keys
```

If anyone else ever needs Git access, add their public key to this file.

## Lock Down Git User

We have our `git` user set up, but anyone who has SSH access to it can run an interactive session
under that account. There's no reason for this, so we'll prevent it by setting the `git` user's shell
to [git-shell](https://git-scm.com/docs/git-shell):

```shell
# Check if git-shell is already configured
cat /etc/shells
# If it isn't run these commands:
which git-shell
sudo -e /etc/shells
```

Then, edit `/etc/passwd` and change the git user's shell to the output of `which git-shell`.

## (Optional) Chroot the Git User

This isn't required (and I may remove this from my setup at some point), but I chroot'd the `git` user
so it only has access to the Git repositories. Other users can reach in, but `git` can't reach out. I
won't go into detail, but here's some [more information](https://www.redhat.com/sysadmin/set-linux-chroot-jails) if you're interested.

## Creating a Repository

```shell
mkdir /srv/git/my-repo.git
cd /srv/git/my-repo.git
git init --bare
```

And that's it! You can clone it like:

```shell
git clone git@[host]:/srv/git/my-repo.git
```

[^1]: This was already the appropriate default, so this may not be necessary.
[^2]: I don't remember this working for me (not sure what the issue was), so I didn't run it. Linode suggests it, though.
[^3]: Might be a good idea to allow SSH over IPv6 too. I don't remember why I explicitly set this option.


