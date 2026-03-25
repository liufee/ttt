package util

import (
	"net"
	"strings"
	"time"
)

func GetLocalIP() ([]string, error) {
	var ips []string
	interfaces, err := net.Interfaces()
	if err != nil {
		return nil, err
	}

	for _, iface := range interfaces {
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}

			if ip == nil || ip.IsLoopback() {
				continue
			}

			if ip.To4() != nil {
				ips = append(ips, ip.String()) // IPv4 地址
			}
		}
	}

	return ips, nil
}

func TimeZone() *time.Location {
	return time.FixedZone("CST", 8*3600)
}

func GetIPAddrs(port string) string {
	ips, err := GetLocalIP()
	if err != nil {
		return err.Error()
	}
	var ipaddrs = ""
	for _, ip := range ips {
		ipaddrs += ip + ":" + port + "-"
	}
	return strings.TrimRight(ipaddrs, "-")
}
