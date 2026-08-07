---
title: "Deploy with me"
description: Just want to post some thoughts outside.
---


# You Got a Ubuntu Server: Now What

Have you ever wondered what it takes to take an app to production?

After having written numerous bits and pieces of test automation software and having worked with embedded devices very often, having seen how complex electromechanical systems comes together, I started to wonder can we visualize this beauty just in software.

Oftentimes, when working with software, it can feel a bit like working in imagination. However, this isn't the case for embedded development. Your code produces scope traces, PWM cycles, bugs that blow up FETs and capacitors, shorts microchips. But this physical stimulation lacks in software.

So, I wanted to create a fully functional system. Maybe I won't be able to scale it up. Maybe I won't be able to continue this, but I want to see one complete system I created that serves, experiences an outage.

But the more I looked it up, the more confusing it got. Full stack started to get scary. I was used to small scale automation and desktop applications. Most of the times, I don't even profile my python applications. And here, in the world of full stack, cloud and docker and kubernetes had taken up the space.

But I was determined.

I wanted to bring a server alive, serve web applications there in docker containers, maybe use kubernetes, talk to the server app over websocket, have postgresql on the server, have grafana, have prometheus. If someone asked, can you build me this service, I want to answer, yes, yes I can.

The possibilities after this are endless.

So I started. I got a ubuntu server.

And then I got stuck.

I didn't know how to connect to the internet let alone do many of those things. I tried looking for resources but they were months of materials.

So I started talking to a LLM to help guide me step by step in setting this up.

If you are on the same page, this is for you too.

So, let's get started.

You got a laptop with ubuntu server installed, now let's connect that to a network first.

---

## First, look before you touch

This is the habit that saved me the most time, so I'll put it first: **find out what's already there before changing anything.**

```bash
ip link show
```

This lists every network interface on the machine. You'll see something like `enp0s31f6` (ethernet) and `wlp2s0` (wireless), plus `lo`, which is the machine talking to itself. Those ugly names aren't random — Ubuntu names interfaces by their physical position on the hardware bus so they stay the same across reboots. Write down your wireless one.

```bash
ip addr show
```

Same list, but now with IP addresses. If you see a line like `inet 192.168.1.42/24`, you already have an address. If you don't, you're not connected yet.

```bash
ip route
```

The line starting with `default via 192.168.1.1` is your **gateway** — the router that forwards anything not on your local network. No default line means you might have an address but no internet.

## Who is actually in charge here?

Here's where I lost an hour. On Ubuntu Server, Wi-Fi is usually managed by **netplan** — but netplan doesn't do the work itself. It reads YAML files and generates config for a backend that does the actual connecting (either `networkd` or `NetworkManager`).

Which means: if netplan is in charge, you don't hand-edit the lower-level config. You'll just end up with two systems fighting over the same wireless card.

```bash
cat /etc/netplan/*.yaml
```

`cat` prints a file. The `*` matches every `.yaml` file in that folder. If you see a `wifis:` block in there, netplan owns your Wi-Fi. Work through it, not around it.

## Adding your network

Back it up first. Always.

```bash
sudo cp /etc/netplan/50-cloud-init.yaml /etc/netplan/50-cloud-init.yaml.bak
```

Then open it:

```bash
sudo nano /etc/netplan/50-cloud-init.yaml
```

(`sudo` because files in `/etc` are owned by root. Without it, nano lets you type and then refuses to save — very annoying to discover after ten minutes of editing.)

Here's the shape it needs:

```yaml
network:
  version: 2
  renderer: networkd
  wifis:
    wlp2s0:
      dhcp4: true
      access-points:
        "YourNetworkName":
          password: "YourPassword"
```

Read it top down: `wifis:` → your interface → its properties. Note that `dhcp4` and `access-points` are at the **same** indentation level, because both are properties of the *interface*. I got this wrong initially and nested `dhcp4` inside `access-points`, which quietly does nothing.

Want more than one network? Add them as siblings:

```yaml
      access-points:
        "HomeWifi":
          password: "password1"
        "PhoneHotspot":
          password: "password2"
```

It'll connect to whichever one is in range. This is how a laptop-as-a-server roams.

**Two spaces per level. Spaces only, never tabs.** Almost every netplan failure I hit was indentation, not concept.

Save with `Ctrl+O`, `Enter`, then `Ctrl+X` to exit.

## Apply it without locking yourself out

```bash
sudo netplan try
```

Not `apply`. `try` puts the config live and waits for you to press Enter to confirm — if you don't, it **reverts automatically after 120 seconds**. If you're SSH'd in from another machine and your config is broken, this is the difference between "oops" and "walk over to the server with a keyboard."

Once it works:

```bash
sudo netplan apply
```

## Did it work?

Run these three in order. Each one tests a different layer, so wherever it breaks tells you what's actually wrong:

```bash
ping -c 4 192.168.1.1    # your gateway — is the local link alive?
ping -c 4 1.1.1.1        # a public IP — does routing to the internet work?
ping -c 4 google.com     # a name — does DNS resolution work?
```

Gateway fails? You're not really on the network. Gateway works but `1.1.1.1` doesn't? Routing or gateway problem. IP works but the name doesn't? It's DNS. (It's usually DNS.)

I use this ladder constantly now. It turns "the internet is broken" into an actual answerable question.

## One laptop-specific thing

If your server is a laptop like mine, close the lid and it goes to sleep. Your server vanishes and nothing in the logs obviously explains why.

```bash
sudo nano /etc/systemd/logind.conf
```

Find `#HandleLidSwitch=suspend`. The `#` makes it a comment — an inactive line showing you the default. Remove the `#` and set it to:

```
HandleLidSwitch=ignore
```

Then:

```bash
sudo systemctl restart systemd-logind
```

That `#`-to-uncomment pattern is everywhere in Linux config. Learning to read it means you can read `/etc`.

---

Next up: getting into this machine from another computer over SSH, and setting up keys so we're not typing passwords like it's 2003.