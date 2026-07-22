# Route 53 Configuration for vartulaa.com

resource "aws_route53_zone" "vartulaa" {
  name = "vartulaa.com"
}

data "aws_lb" "nginx" {
  tags = {
    "kubernetes.io/service-name" = "ingress-nginx/ingress-nginx-controller"
  }
  depends_on = [helm_release.ingress]
}

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.vartulaa.zone_id
  name    = "api.vartulaa.com"
  type    = "A"
  alias {
    name                   = data.aws_lb.nginx.dns_name
    zone_id                = data.aws_lb.nginx.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "admin" {
  zone_id = aws_route53_zone.vartulaa.zone_id
  name    = "admin.vartulaa.com"
  type    = "A"
  alias {
    name                   = data.aws_lb.nginx.dns_name
    zone_id                = data.aws_lb.nginx.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.vartulaa.zone_id
  name    = "www.vartulaa.com"
  type    = "A"
  alias {
    name                   = data.aws_lb.nginx.dns_name
    zone_id                = data.aws_lb.nginx.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.vartulaa.zone_id
  name    = "vartulaa.com"
  type    = "A"
  alias {
    name                   = "www.vartulaa.com"
    zone_id                = aws_route53_zone.vartulaa.zone_id
    evaluate_target_health = true
  }
  depends_on = [aws_route53_record.www]
}
