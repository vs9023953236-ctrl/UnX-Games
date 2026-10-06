-- 20260922002000_update_sync_notification_routing.sql
-- Notification routing & trigger enhancements for GHN real-time sync bus

CREATE OR REPLACE FUNCTION public.emit_ghn_sync_event()
RETURNS TRIGGER AS $$
DECLARE
    v_target_user VARCHAR(128) := NULL;
    v_safe_meta JSONB := '{}'::jsonb;
    v_entity_type VARCHAR(64);
    v_event_type VARCHAR(64);
    v_entity_id VARCHAR(128);
BEGIN
    v_entity_type := TG_TABLE_NAME;
    v_event_type := TG_TABLE_NAME || '.' || lower(TG_OP);

    IF (TG_OP = 'DELETE') THEN
        v_entity_id := OLD.id::text;
    ELSE
        v_entity_id := NEW.id::text;
    END IF;

    -- Extract safe metadata based on entity
    IF TG_TABLE_NAME = 'orders' THEN
        v_target_user := COALESCE(NEW.customer_id::text, OLD.customer_id::text);
        v_safe_meta := jsonb_build_object(
            'order_id', v_entity_id,
            'status', COALESCE(NEW.status, OLD.status)
        );
    ELSIF TG_TABLE_NAME = 'kyc_verifications' THEN
        v_target_user := COALESCE(NEW.customer_id::text, OLD.customer_id::text);
        v_safe_meta := jsonb_build_object(
            'kyc_id', v_entity_id,
            'status', COALESCE(NEW.status, OLD.status)
        );
    ELSIF TG_TABLE_NAME = 'customers' THEN
        v_target_user := v_entity_id;
        v_safe_meta := jsonb_build_object(
            'customer_id', v_entity_id,
            'status', COALESCE(NEW.status, OLD.status)
        );
    ELSIF TG_TABLE_NAME = 'notifications' THEN
        v_target_user := COALESCE(NEW.user_id::text, NEW.customer_id::text);
        v_safe_meta := jsonb_build_object(
            'notification_id', v_entity_id
        );
    ELSIF TG_TABLE_NAME = 'wallet_transactions' THEN
        v_target_user := COALESCE(NEW.customer_id::text, OLD.customer_id::text);
        v_safe_meta := jsonb_build_object(
            'transaction_id', v_entity_id,
            'status', COALESCE(NEW.status, OLD.status)
        );
    END IF;

    -- Insert into safe sync event bus
    INSERT INTO public.ghn_sync_events (
        event_type,
        entity_type,
        entity_id,
        target_user_id,
        safe_metadata
    ) VALUES (
        v_event_type,
        v_entity_type,
        v_entity_id,
        v_target_user,
        v_safe_meta
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Graceful degradation: never block transaction if sync event logging encounters issue
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
