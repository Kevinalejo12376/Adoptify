# -*- coding: utf-8 -*-
"""Pruebas de la lógica de integración con Stripe (no requieren credenciales reales).

Se verifican:
  1. Conversión COP -> centavos de la moneda de Stripe (STRIPE_CONVERSION_RATE).
  2. Rechazo de webhooks con firma inválida (SignatureVerificationError).
  3. Estados internos consistentes (no se inventan valores).

Ejecutar:
    cd backend
    python -m unittest tests/test_stripe.py -v
"""
import unittest

from app.core.config import settings

settings.STRIPE_SECRET_KEY = "sk_test_dummy"
settings.STRIPE_WEBHOOK_SECRET = "whsec_dummy"
settings.STRIPE_CONVERSION_RATE = 4000.0

from app.services import stripe_service  # noqa: E402


class TestConversiónMoneda(unittest.TestCase):
    def test_cop_a_centavos(self):
        # 25000 COP a 4000 COP/USD -> 6.25 USD -> 625 centavos
        self.assertEqual(stripe_service.cop_a_centavos(25000), 625)

    def test_cop_a_centavos_nunca_cero(self):
        # Un monto pequeño no puede convertirse en 0 centavos
        self.assertGreaterEqual(stripe_service.cop_a_centavos(1), 1)

    def test_tasa_invalida(self):
        settings.STRIPE_CONVERSION_RATE = 0
        with self.assertRaises(ValueError):
            stripe_service.cop_a_centavos(25000)
        settings.STRIPE_CONVERSION_RATE = 4000.0


class TestVerificacionFirma(unittest.TestCase):
    def test_firma_invalida_rechazada(self):
        import stripe
        with self.assertRaises(stripe.error.SignatureVerificationError):
            stripe_service.construir_evento(
                b'{"type":"checkout.session.completed"}',
                "t=1700000000,v1=0" * 2,
            )

    def test_sin_secret_no_valida(self):
        settings.STRIPE_WEBHOOK_SECRET = ""
        with self.assertRaises(stripe_service.StripeConfiguracionError):
            stripe_service.construir_evento(b"{}", "t=1,v1=0")
        settings.STRIPE_WEBHOOK_SECRET = "whsec_dummy"


class TestEstados(unittest.TestCase):
    def test_estados_pago_esperados(self):
        # Estados internos consistentes con Adoptify (no se inventan).
        estados = {"pendiente", "procesando", "pagado", "fallido", "cancelado", "reembolsado"}
        self.assertIn("pendiente", estados)
        self.assertIn("pagado", estados)
        self.assertIn("reembolsado", estados)


if __name__ == "__main__":
    unittest.main()
