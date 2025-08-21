-- Create trigger for handle_new_user to be called when a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for send_vendor_welcome_email to be called when a user is created  
CREATE TRIGGER on_vendor_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.send_vendor_welcome_email();