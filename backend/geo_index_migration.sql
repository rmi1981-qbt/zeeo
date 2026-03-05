-- Adicionando novos campos na tabela condominiums para suportar regras de entrega do Hub (Geo-Index)

-- Tipos de condomínio:
-- 'vertical'   -> Prédios / Condomínios de edifícios
-- 'horizontal' -> Condomínios de casas / Loteamentos
-- 'mixed'      -> Mistos (Prédios e casas)
ALTER TABLE public.condominiums 
ADD COLUMN IF NOT EXISTS condo_type VARCHAR(50) DEFAULT 'horizontal';

-- Políticas de entrega Padrão:
-- 'driver_enters' -> Entregador acessa o condomínio e vai até a porta/torre
-- 'driver_waits'  -> Entregador aguarda na portaria (morador desce)
-- 'lockers'       -> Entregador deixa em caixas inteligentes / smart lockers na portaria
ALTER TABLE public.condominiums 
ADD COLUMN IF NOT EXISTS delivery_policy VARCHAR(50) DEFAULT 'driver_waits';

-- Notificação para o realtime (opcional se precisar rastrear)
-- UPDATE public.condominiums SET condo_type = 'vertical' WHERE name ILIKE '%edifício%';
