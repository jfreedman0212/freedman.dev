---
title: "How I Set Up My Server"
tagline: "If I don't write about this now, I will forget everything in 6 months."
datePosted: 2023-02-13T04:09:36.630Z 
tags: ["apache","linode","cgit","linux"]
---
This is less of a blog post and more of a compilation of my notes for setting up my web server.
Feel free to follow along or try this yourself, but I won't go into too much detail unless it
will help me remember later. Additionally, this guide assumes you're running on Debian 11, so
adjust any of the commands (mainly package manager ones) accordingly. Before we get started, we
need to: 

1. Buy a domain
2. Rent a VPS somewhere (I run this on [Linode](https://www.linode.com/) for $5 per month)

# Secure Server with Sane Defaults

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

# Enable Git Access via SSH

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
won't go into detail, but here's some
[more information](https://www.howtogeek.com/441534/how-to-use-the-chroot-command-on-linux/) if you're interested.
While using `git-shell` prevents users from doing anything interactively, I wanted to prevent someone from
getting access to other parts of the file system via a `git clone` command. This could probably be
accomplished through stricter permissions.

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

# Install cgit

[cgit](https://git.zx2c4.com/cgit/about/) is a web UI for Git repositories written in C. There's nothing fancy about it:
it's just a way to make navigating repos a little bit nicer. Yes, GitHub does that, and there are other tools that are
more conducive for collaboration and can be self-hosted (Gitea, Gogs, and GitLab to name a few), but I wanted something that:

- served read-only web pages
- served little to no JavaScript
- didn't look horribly ugly

There _are_ some tweaks I'd like to make to my cgit instance to make it nicer looking, but that's besides the point.
Let's set it up!

## Installation

```shell
sudo apt install cgit
# Used for syntax highlighting
sudo apt install highlight
```

This creates a couple directories and files:

- `/etc/cgitrc`: the configuration file that cgit reads on every request
- `/usr/share/webapps/cgit`: static files and content to be used by cgit
- `/usr/lib/cgit`: contains the CGI executable (`cgit.cgi`) and some pre-built extensions

However, we're going to move these to an easier location to manage:

```shell
sudo mkdir -p /var/www/src.freedman.dev
sudo ln -s /usr/lib/cgit/cgit.cgi /var/www/src.freedman.dev/cgit.cgi
sudo mv /usr/share/webapps/cgit/* /var/www/src.freedman.dev
sudo chown -R www-data:www-data /var/www/src.freedman.dev
```

## Global Configuration

First, let's modify `/etc/cgitrc` (for more info on each config option, the [man page on the Arch Linux wiki](https://man.archlinux.org/man/cgitrc.5) is pretty good):

```
# Stylistic options
css=/cgit.css
logo=/cgit.png
virtual-root=/
root-title=Josh Freedman's Git Repositories
root-desc=My personal projects, probably unfinished or half-baked
root-readme=/srv/git/README.html
head-include=/srv/git/head-include.html

# Global Repository options
readme=trunk:README.html
readme=main:README.html
readme=master:README.html
readme=trunk:readme.html
readme=main:readme.html
readme=master:readme.html
enable-index-owner=1
source-filter=/usr/lib/cgit/filters/syntax-highlighting.sh
scan-path=/srv/git
```

Create `/srv/git/head-include.html` and put this content into it:

```html
<meta name="og:site_name" content="Josh Freedman's Git Repositories" />
<meta name="og:image" content="https://src.freedman.dev/favicon.ico" />
```

Create a `/srv/git/README.html` file and put whatever in it, it will get displayed on the "About" page
from the home page.

## Repository-Specific Configuration

We've configured cgit globally, but repositories need a cgitrc specific to them to store any repo-specific
data. We could manually add a `cgitrc` to the repository on the server, or we can add it to the template
that Git uses to create the repository. Then, we'll create a little script that makes this process easier.

First, create a file at `/usr/share/git-core/templates/cgitrc`:

```
url=$REPO_FILE_NAME
name=$REPO_NAME
desc=$REPO_DESC
extra-head-content=<meta name="og:title" content="$REPO_NAME" /><meta name="og:description" content="$REPO_DESC" /><meta name="og:url" content="https://src.freedman.dev/$REPO_FILE_NAME" />
owner=Josh Freedman
image=/favicon.ico
```

Note that there's environment-variable syntax in there. This is because we'll expand them to the
repo-specific values in our script:

```shell
#!/bin/bash

# RUN THIS AS ROOT!
# Helpful command: sudo -u root [path to this script]

REPOS_ROOT=/srv/git

# Read in values from stdin
read -p "File Name (.git will be added automatically): " REPO_FILE_NAME
REPO_FILE_NAME=$REPO_FILE_NAME.git
read -p "Name: " REPO_NAME
read -p "Description: " REPO_DESC

FULL_REPO_PATH="$REPOS_ROOT/$REPO_FILE_NAME"

# make them available to envsubst
export REPO_FILE_NAME
export REPO_NAME
export REPO_DESC

# Create the repository from the template
mkdir $FULL_REPO_PATH
cd $FULL_REPO_PATH 
git init --bare

# Expand environment variables in the default cgitrc
cat "$FULL_REPO_PATH/cgitrc" | envsubst > "$FULL_REPO_PATH/cgitrc_expanded"
rm "$FULL_REPO_PATH/cgitrc"
mv "$FULL_REPO_PATH/cgitrc_expanded" "$FULL_REPO_PATH/cgitrc"

# Set permissions appropriately
chown -R git:git "$FULL_REPO_PATH"
chmod g+rx -R "$FULL_REPO_PATH"
```

# Set Up Personal Website

These are just static files in the `/var/www/freedman.dev` folder. To set this up:

```shell
sudo mkdir -p /var/www/freedman.dev
sudo chown -R www-data:www-data /var/www/freedman.dev
```

Then, copy the files to serve into this folder.

# Set Up Web Server

Finally, the main event: the web server. This will route all requests made by a browser to the appropriate
place. For my server, I want two sites:

1. My personal site/blog: at freedman.dev (and www.freedman.dev)
2. My Git repositories via cgit: at src.freedman.dev

My personal site will be entirely static files, and my Git repos will be served by cgit (which Apache runs
under CGI). Let's get started!

## DNS Configuration

DNS lets us use memorable names to refer to computers instead of IP addresses by creating A/AAAA records.
These can be used for both the root domain and any subdomains. A records are for IPv4, and AAAA records are
for IPv6. In your domain registrar, create the following records:

| DNS Record | Host             | Value |
|------------|------------------|-------|
| A          | freedman.dev     | IPv4  |
| AAAA       | freedman.dev     | IPv6  |
| A          | www.freedman.dev | IPv4  |
| AAAA       | www.freedman.dev | IPv6  |
| A          | src.freedman.dev | IPv4  |
| AAAA       | src.freedman.dev | IPv6  |

Repeat this configuration in your cloud provider if necessary (I had to do so for Linode for some reason)[^4].

## Apache

Let's start by installing Apache and opening up the firewall to the appropriate ports (80 
for HTTP and 443 for HTTPS)[^5]:

```shell
sudo apt install apache2
sudo ufw allow http
sudo ufw allow https
```

This creates a bunch of directories and files:

- `/etc/apache2`: the root of all Apache config, which has:
    - `apache2.conf`: the root conf file (we won't be touching this)
    - `sites-available` and `sites-enabled`: the former contains all [Virtual Hosts](https://httpd.apache.org/docs/current/vhosts/) that we can use, and the latter contains symlinks to all that are currently active
- `/var/www/`: the root of all static content being served
- `/var/log/apache`: the root of the logs
    - `error.log`: error logs (super helpful for debugging)

And a ton of other stuff too, but those are the big ones. Note that all of these are owned or ran by the
`www-data` user in the `www-data` group. This will be important later.

Next, we'll set up some Virtual Hosts; they'll both go into `/etc/apache2/sites-available`. First will go
under `001-mysites.conf`:

```
<VirtualHost *:80>
    ServerName freedman.dev
    ServerAlias www.freedman.dev
    DocumentRoot /var/www/freedman.dev
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```

And another under `002-src.conf`:

```
<VirtualHost *:80>
    ServerName src.freedman.dev
    DocumentRoot /var/www/src.freedman.dev
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
    
    <Directory "/var/www/src.freedman.dev">
        Options +ExecCGI +FollowSymLinks +SymLinksIfOwnerMatch
        AddHandler cgi-script .cgi
        DirectoryIndex cgit.cgi

        RewriteEngine on
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule (.*) /cgit.cgi/$1 [END,QSA]

        RewriteCond %{QUERY_STRING} service=git-receive-pack
        RewriteRule .* - [END,F]
    </Directory>
    <Directory "/srv/git">
        Require all granted
    </Directory>
</VirtualHost>
```

Before going any further, let's break down a couple things here:

1. No content is being served via HTTPS yet since we're only listening on port 80 (regular, unencrypted HTTP). We'll run certbot on these configurations and it will generate HTTPS configs from these ones.
2. The cgit configuration is pulled straight from [Andrew Marchetta's great blog post](https://www.andrewmarchetta.com/computing/setting-up-cgit-on-apache/). Highly recommend checking it out!

### Enable the Sites and Modules

```shell
# add the www-data user to the git group so it can
# read/execute the /srv/git folder
sudo usermod -a -G git www-data
# enable CGI module for cgit
sudo a2enmod cgi.load
# enable our website configurations
sudo a2ensite 001-mysites.conf
sudo a2ensite 002-src.conf
# alternatively, manually symlink the sites from /etc/apache2/[xyz]-available to [xyz]-enabled
```

### HTTPS via Certbot

HTTPS is a must for all websites, even sites like these that have no authentication and no sensitive data
being transmitted between the browser and my servers. [Certbot](https://certbot.eff.org/) is a 
free tool that will generate HTTPS certificates so browsers can trust us. The process for 
installation and setup goes as follows:

```shell
sudo apt install snapd
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot --apache
# if all is successful, restart apache for the changes to take effect
sudo systemctl restart apache2
```

Cerbot should automatically pick up all the domains/subdomains in your Apache config and be able to make the
modifications necessary.

# Optional Next Steps

While this should result in a working web server, there are some potential areas of improvement:

1. Instead of relying on manual configuration of the `git` user, use something like
[Gitolite](https://gitolite.com/gitolite/index.html).
2. Set up continuous integration, either stitched together using `post-receive` hooks that trigger the
[at](https://linuxize.com/post/at-command-in-linux/) command, or through a real CI system.
3. Make cgit's UI look nicer, namely around mobile-friendly UI and dark mode (the latter of which appears to be included
in the latest commits of cgit).
4. Look into managing environments with [Nix](https://nixos.org/). Maybe even run the server with NixOS and have all configuration stored as a file?

# Thanks

I'd like to thank my friend Justin ~~and my girlfriend Amaya~~[^6] for listening to me rant about the various
issues I ran into. And if you made it all the way down here, thanks to you for reading!

[^1]: This was already the appropriate default, so this may not be necessary.
[^2]: I don't remember this working for me (not sure what the issue was), so I didn't run it. Linode suggests it, though.
[^3]: Might be a good idea to allow SSH over IPv6 too. I don't remember why I explicitly set this option.
[^4]: Google Domains shows the whole domain, but Linode only showed the subdomain part. So, the first two records would be blank, but then the last 2 would just contain "src".
[^5]: The "apache2" verbiage is Debian-specific. Some distros refer to it as "httpd". It's the same software with the same configuration, just different names.
[^6]: "I didn't even listen, you just talked at me for 20 minutes straight without letting me get a word in" -Amaya

